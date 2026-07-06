import { BATCHES, BRANCHES } from "@/lib/constants";
import { JOB_TYPE_OPTIONS } from "@/lib/company-constants";
import {
  AiProviderError,
  completeJsonWithOpenAi,
  getAiConfig,
} from "@/lib/services/ai-provider";
import { getActiveTechSkills } from "@/lib/services/tech-stack";
import {
  jdParseDraftSchema,
  jdParseResultSchema,
} from "@/lib/validations/jd-parser";
import type {
  JDParseDraft,
  JDParseResult,
  ParseJdRequest,
} from "@/types/jd-parser";

const JD_PREVIEW_MAX = 500;

const SKILL_ALIASES: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  node: "Node.js",
  nodejs: "Node.js",
  reactjs: "React",
  react: "React",
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  mongo: "MongoDB",
  mongodb: "MongoDB",
  ml: "Machine Learning",
  "machine learning": "Machine Learning",
  "deep learning": "Deep Learning",
  nlp: "NLP",
  aws: "AWS",
  azure: "Azure",
  gcp: "Google Cloud",
  "google cloud": "Google Cloud",
};

function emptyDraft(): JDParseDraft {
  return {
    companyName: null,
    roleTitle: null,
    jobType: null,
    eligibleBranches: [],
    eligibleBatches: [],
    graduationYear: null,
    minCgpa: null,
    allowActiveBacklogs: false,
    maxActiveBacklogs: 0,
    requiredSkills: [],
    preferredSkills: [],
    requiredRoleInterests: [],
    minTechnicalScore: 0,
    minCommunicationScore: 0,
    minResumeScore: 0,
    minReadinessScore: 0,
    requireResumeApproved: false,
    requireAtsFriendly: false,
    requireLinkedIn: false,
    requireGitHub: false,
    notes: null,
  };
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.4;
  return Math.min(1, Math.max(0, value));
}

function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

async function buildSkillNormalizer(): Promise<{
  normalize: (raw: string) => string;
  findInText: (text: string) => { required: string[]; preferred: string[] };
}> {
  const masterSkills = await getActiveTechSkills();
  const canonicalByLower = new Map<string, string>();

  for (const skill of masterSkills) {
    canonicalByLower.set(skill.name.toLowerCase(), skill.name);
  }

  for (const [alias, canonical] of Object.entries(SKILL_ALIASES)) {
    if (!canonicalByLower.has(canonical.toLowerCase())) {
      canonicalByLower.set(canonical.toLowerCase(), canonical);
    }
    canonicalByLower.set(alias.toLowerCase(), canonical);
  }

  function normalize(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return trimmed;
    return canonicalByLower.get(trimmed.toLowerCase()) ?? trimmed;
  }

  function findInText(text: string): { required: string[]; preferred: string[] } {
    const lower = text.toLowerCase();
    const required: string[] = [];
    const preferred: string[] = [];

    const allNames = [
      ...masterSkills.map((s) => s.name),
      ...Object.values(SKILL_ALIASES),
    ];

    for (const name of allNames) {
      const pattern = new RegExp(
        `\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "i"
      );
      if (!pattern.test(lower)) continue;

      const canonical = normalize(name);
      const contextWindow = lower.slice(
        Math.max(0, lower.search(pattern) - 40),
        lower.search(pattern) + 40
      );
      const isPreferred =
        /preferred|nice to have|good to have|bonus/.test(contextWindow);

      if (isPreferred) preferred.push(canonical);
      else required.push(canonical);
    }

    return {
      required: uniqueStrings(required),
      preferred: uniqueStrings(preferred.filter((s) => !required.includes(s))),
    };
  }

  return { normalize, findInText };
}

function detectRoleTitle(text: string, roleHint?: string): string | null {
  if (roleHint?.trim()) return roleHint.trim();

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const labeled = lines.find((line) =>
    /^(job title|position|role)\s*[:–-]/i.test(line)
  );
  if (labeled) {
    return labeled.replace(/^(job title|position|role)\s*[:–-]\s*/i, "").trim();
  }

  const titleLine = lines.find(
    (line) =>
      line.length <= 80 &&
      /(engineer|developer|analyst|intern|consultant|architect|designer)/i.test(
        line
      )
  );
  if (titleLine) return titleLine;

  return lines[0]?.length <= 100 ? lines[0] : null;
}

function detectJobType(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\bintern(ship)?\b/.test(lower)) return "INTERNSHIP";
  if (/\bcontract\b/.test(lower)) return "CONTRACT";
  if (/\bapprentice(ship)?\b/.test(lower)) return "APPRENTICESHIP";
  if (/\bfull[\s-]?time\b/.test(lower)) return "FULL_TIME";
  return null;
}

function detectCgpa(text: string): number | null {
  const cgpaMatch = text.match(
    /(?:cgpa|gpa)\s*(?:of|>=?|:)?\s*([0-9]+(?:\.[0-9]+)?)/i
  );
  if (cgpaMatch) {
    const value = Number.parseFloat(cgpaMatch[1]);
    if (value <= 10) return value;
  }

  const percentMatch = text.match(
    /(?:minimum|min\.?|at least)\s*([0-9]{2})(?:\s*%|\s*percent)/i
  );
  if (percentMatch) {
    const pct = Number.parseInt(percentMatch[1], 10);
    if (pct >= 50 && pct <= 100) return Math.round((pct / 10) * 10) / 10;
  }

  return null;
}

function detectBranches(text: string): string[] {
  const found: string[] = [];
  const lower = text.toLowerCase();
  for (const branch of BRANCHES) {
    if (lower.includes(branch.toLowerCase())) {
      found.push(branch);
    }
  }
  return uniqueStrings(found);
}

function detectBatches(text: string): string[] {
  const found: string[] = [];
  for (const batch of BATCHES) {
    if (text.includes(batch)) found.push(batch);
  }
  const yearMatch = text.match(/\b(20\d{2})\s*(?:batch|graduat)/i);
  if (yearMatch) {
    const year = yearMatch[1];
    const batch = BATCHES.find((b) => b.includes(year));
    if (batch) found.push(batch);
  }
  return uniqueStrings(found);
}

function detectGraduationYear(text: string): number | null {
  const match = text.match(
    /(?:graduation|passing)\s*(?:year|batch)?\s*[:–-]?\s*(20\d{2})/i
  );
  if (match) return Number.parseInt(match[1], 10);
  const batchYear = text.match(/\b(20\d{2})[-–](20\d{2})\b/);
  if (batchYear) return Number.parseInt(batchYear[2], 10);
  return null;
}

function detectBacklogs(text: string): {
  allowActiveBacklogs: boolean;
  maxActiveBacklogs: number;
} {
  const lower = text.toLowerCase();
  if (
    /no\s+active\s+backlogs?/.test(lower) ||
    /zero\s+backlogs?/.test(lower) ||
    /without\s+backlogs?/.test(lower)
  ) {
    return { allowActiveBacklogs: false, maxActiveBacklogs: 0 };
  }

  const maxMatch = lower.match(/(?:max|maximum|upto|up to)\s*(\d+)\s+backlogs?/);
  if (maxMatch) {
    return {
      allowActiveBacklogs: true,
      maxActiveBacklogs: Number.parseInt(maxMatch[1], 10),
    };
  }

  if (/active\s+backlogs?\s+allowed/.test(lower)) {
    return { allowActiveBacklogs: true, maxActiveBacklogs: 1 };
  }

  return { allowActiveBacklogs: false, maxActiveBacklogs: 0 };
}

function detectScores(text: string): Partial<JDParseDraft> {
  const lower = text.toLowerCase();
  const result: Partial<JDParseDraft> = {};

  const tech = lower.match(/technical\s+score\s*(?:>=?|:)?\s*(\d{1,3})/i);
  if (tech) result.minTechnicalScore = Number.parseInt(tech[1], 10);

  const comm = lower.match(/communication\s+score\s*(?:>=?|:)?\s*(\d{1,3})/i);
  if (comm) result.minCommunicationScore = Number.parseInt(comm[1], 10);

  const resume = lower.match(/resume\s+score\s*(?:>=?|:)?\s*(\d{1,3})/i);
  if (resume) result.minResumeScore = Number.parseInt(resume[1], 10);

  const readiness = lower.match(/readiness\s+score\s*(?:>=?|:)?\s*(\d{1,3})/i);
  if (readiness) result.minReadinessScore = Number.parseInt(readiness[1], 10);

  return result;
}

function detectRequirements(text: string): Partial<JDParseDraft> {
  const lower = text.toLowerCase();
  return {
    requireResumeApproved: /resume\s+approved/.test(lower),
    requireAtsFriendly: /ats[\s-]?friendly/.test(lower),
    requireLinkedIn: /\blinkedin\b/.test(lower),
    requireGitHub: /\bgithub\b/.test(lower),
  };
}

function detectRoleInterests(text: string, roleTitle: string | null): string[] {
  const interests: string[] = [];
  if (roleTitle) interests.push(roleTitle);

  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (/role interest|interested in/i.test(line)) {
      const value = line.replace(/.*[:–-]\s*/, "").trim();
      if (value) interests.push(value);
    }
  }

  return uniqueStrings(interests);
}

function buildMissingInfo(draft: JDParseDraft): string[] {
  const missing: string[] = [];
  if (!draft.roleTitle) missing.push("Role title");
  if (draft.eligibleBranches.length === 0) missing.push("Eligible branches");
  if (draft.requiredSkills.length === 0) missing.push("Required skills");
  if (draft.minCgpa == null) missing.push("Minimum CGPA");
  if (draft.graduationYear == null && draft.eligibleBatches.length === 0) {
    missing.push("Graduation year or batch");
  }
  return missing;
}

function buildWarnings(draft: JDParseDraft, provider: "openai" | "rules"): string[] {
  const warnings: string[] = [];
  if (provider === "rules") {
    warnings.push(
      "Parsed with rule-based fallback. Review all fields before saving."
    );
  }
  if (draft.requiredSkills.some((s) => s.length > 0)) {
    const unknownPattern = /^(custom|other)/i;
    if (draft.requiredSkills.some((s) => unknownPattern.test(s))) {
      warnings.push("Some skills may not match the tech skill master list.");
    }
  }
  if (draft.jobType && !JOB_TYPE_OPTIONS.some((o) => o.value === draft.jobType)) {
    warnings.push("Job type may need manual correction.");
  }
  return warnings;
}

export async function parseJdWithRules(
  input: ParseJdRequest,
  companyNameOverride?: string | null
): Promise<JDParseResult> {
  const text = input.jdText.trim();
  const { normalize, findInText } = await buildSkillNormalizer();
  const skills = findInText(text);
  const roleTitle = detectRoleTitle(text, input.roleHint);
  const backlogs = detectBacklogs(text);
  const scores = detectScores(text);
  const requirements = detectRequirements(text);

  const draft: JDParseDraft = {
    ...emptyDraft(),
    companyName: companyNameOverride ?? input.companyName?.trim() ?? null,
    roleTitle,
    jobType: detectJobType(text),
    eligibleBranches: detectBranches(text),
    eligibleBatches: detectBatches(text),
    graduationYear: detectGraduationYear(text),
    minCgpa: detectCgpa(text),
    ...backlogs,
    requiredSkills: skills.required.map(normalize),
    preferredSkills: skills.preferred.map(normalize),
    requiredRoleInterests: detectRoleInterests(text, roleTitle),
    ...scores,
    ...requirements,
    notes: "Auto-extracted from job description. Review before activating.",
  };

  const missingInfo = buildMissingInfo(draft);
  const confidenceScore = clampConfidence(
    0.35 +
      (draft.roleTitle ? 0.15 : 0) +
      (draft.requiredSkills.length > 0 ? 0.15 : 0) +
      (draft.minCgpa != null ? 0.1 : 0) +
      (draft.eligibleBranches.length > 0 ? 0.1 : 0)
  );

  return jdParseResultSchema.parse({
    draft,
    confidenceScore,
    warnings: buildWarnings(draft, "rules"),
    missingInfo,
    provider: "rules",
    aiEnabled: getAiConfig().isEnabled,
  });
}

const AI_SYSTEM_PROMPT = `You extract structured college placement requirement fields from job descriptions.
Return ONLY valid JSON with this shape:
{
  "companyName": string | null,
  "roleTitle": string | null,
  "jobType": "FULL_TIME" | "INTERNSHIP" | "CONTRACT" | "APPRENTICESHIP" | null,
  "eligibleBranches": string[],
  "eligibleBatches": string[],
  "graduationYear": number | null,
  "minCgpa": number | null,
  "allowActiveBacklogs": boolean,
  "maxActiveBacklogs": number,
  "requiredSkills": string[],
  "preferredSkills": string[],
  "requiredRoleInterests": string[],
  "minTechnicalScore": number,
  "minCommunicationScore": number,
  "minResumeScore": number,
  "minReadinessScore": number,
  "requireResumeApproved": boolean,
  "requireAtsFriendly": boolean,
  "requireLinkedIn": boolean,
  "requireGitHub": boolean,
  "notes": string | null,
  "confidenceScore": number between 0 and 1,
  "warnings": string[],
  "missingInfo": string[]
}
Use conservative defaults (0 for scores, false for requirements) when unclear.
Do not invent skills not mentioned in the JD.`;

async function parseJdWithOpenAi(
  input: ParseJdRequest,
  companyNameOverride?: string | null
): Promise<JDParseResult> {
  const userPrompt = [
    companyNameOverride
      ? `Company name hint: ${companyNameOverride}`
      : input.companyName
        ? `Company name hint: ${input.companyName}`
        : null,
    input.roleHint ? `Role hint: ${input.roleHint}` : null,
    "Job description:",
    input.jdText.slice(0, 12000),
  ]
    .filter(Boolean)
    .join("\n\n");

  const raw = await completeJsonWithOpenAi(AI_SYSTEM_PROMPT, userPrompt);
  const parsed = JSON.parse(raw) as Record<string, unknown>;

  const { normalize } = await buildSkillNormalizer();

  const draftInput = {
    companyName:
      companyNameOverride ??
      (typeof parsed.companyName === "string" ? parsed.companyName : null) ??
      input.companyName ??
      null,
    roleTitle: typeof parsed.roleTitle === "string" ? parsed.roleTitle : null,
    jobType: typeof parsed.jobType === "string" ? parsed.jobType : null,
    eligibleBranches: Array.isArray(parsed.eligibleBranches)
      ? parsed.eligibleBranches.filter((v): v is string => typeof v === "string")
      : [],
    eligibleBatches: Array.isArray(parsed.eligibleBatches)
      ? parsed.eligibleBatches.filter((v): v is string => typeof v === "string")
      : [],
    graduationYear:
      typeof parsed.graduationYear === "number" ? parsed.graduationYear : null,
    minCgpa: typeof parsed.minCgpa === "number" ? parsed.minCgpa : null,
    allowActiveBacklogs: Boolean(parsed.allowActiveBacklogs),
    maxActiveBacklogs:
      typeof parsed.maxActiveBacklogs === "number" ? parsed.maxActiveBacklogs : 0,
    requiredSkills: Array.isArray(parsed.requiredSkills)
      ? parsed.requiredSkills
          .filter((v): v is string => typeof v === "string")
          .map(normalize)
      : [],
    preferredSkills: Array.isArray(parsed.preferredSkills)
      ? parsed.preferredSkills
          .filter((v): v is string => typeof v === "string")
          .map(normalize)
      : [],
    requiredRoleInterests: Array.isArray(parsed.requiredRoleInterests)
      ? parsed.requiredRoleInterests.filter((v): v is string => typeof v === "string")
      : [],
    minTechnicalScore:
      typeof parsed.minTechnicalScore === "number" ? parsed.minTechnicalScore : 0,
    minCommunicationScore:
      typeof parsed.minCommunicationScore === "number"
        ? parsed.minCommunicationScore
        : 0,
    minResumeScore:
      typeof parsed.minResumeScore === "number" ? parsed.minResumeScore : 0,
    minReadinessScore:
      typeof parsed.minReadinessScore === "number" ? parsed.minReadinessScore : 0,
    requireResumeApproved: Boolean(parsed.requireResumeApproved),
    requireAtsFriendly: Boolean(parsed.requireAtsFriendly),
    requireLinkedIn: Boolean(parsed.requireLinkedIn),
    requireGitHub: Boolean(parsed.requireGitHub),
    notes:
      typeof parsed.notes === "string"
        ? parsed.notes
        : "AI-extracted from job description. Review before activating.",
  };

  const draft = jdParseDraftSchema.parse(draftInput);
  const missingInfo =
    Array.isArray(parsed.missingInfo) &&
    parsed.missingInfo.every((v) => typeof v === "string")
      ? (parsed.missingInfo as string[])
      : buildMissingInfo(draft);

  const warnings =
    Array.isArray(parsed.warnings) &&
    parsed.warnings.every((v) => typeof v === "string")
      ? (parsed.warnings as string[])
      : buildWarnings(draft, "openai");

  return jdParseResultSchema.parse({
    draft,
    confidenceScore: clampConfidence(
      typeof parsed.confidenceScore === "number" ? parsed.confidenceScore : 0.7
    ),
    warnings,
    missingInfo,
    provider: "openai",
    aiEnabled: true,
  });
}

export function jdTextPreview(text: string): string {
  return text.trim().slice(0, JD_PREVIEW_MAX);
}

export async function parseJobDescription(
  input: ParseJdRequest,
  companyNameOverride?: string | null
): Promise<JDParseResult> {
  const config = getAiConfig();

  if (config.isEnabled) {
    try {
      return await parseJdWithOpenAi(input, companyNameOverride);
    } catch (error) {
      if (error instanceof AiProviderError) {
        const rules = await parseJdWithRules(input, companyNameOverride);
        return {
          ...rules,
          warnings: [
            "AI parsing unavailable — used rule-based fallback.",
            ...rules.warnings,
          ],
        };
      }
      throw error;
    }
  }

  return parseJdWithRules(input, companyNameOverride);
}

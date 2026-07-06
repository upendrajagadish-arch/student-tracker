import { prisma } from "@/lib/db";
import {
  AiProviderError,
  completeJsonWithOpenAi,
  getAiConfig,
} from "@/lib/services/ai-provider";
import { getResumeFileBuffer, reviewResume } from "@/lib/services/resumes";
import {
  extractResumeText,
  resumeTextPreview,
  textForAiPrompt,
  ResumeTextExtractionError,
} from "@/lib/services/resume-text-extractor";
import { getActiveTechSkills, getStudentRoleInterests, getStudentTechSkills } from "@/lib/services/tech-stack";
import { getGitHubProfileForStudent } from "@/lib/services/github";
import {
  detectCodingPlatformsInText,
  getCodingEvidenceForResumeTruth,
} from "@/lib/services/coding-platforms";
import { triggerReadinessRecalculation } from "@/lib/services/readiness";
import { resumeInsightAnalysisSchema } from "@/lib/validations/resume-insights";
import type {
  ResumeInsightAnalysis,
  ResumeInsightRecord,
  ResumeInsightReviewStatus,
  RoleSuitabilityItem,
} from "@/types/resume-insights";

const SKILL_ALIASES: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  node: "Node.js",
  nodejs: "Node.js",
  reactjs: "React",
  postgres: "PostgreSQL",
  mongodb: "MongoDB",
};

const SECTION_PATTERNS: Array<{ section: string; pattern: RegExp }> = [
  { section: "Education", pattern: /\beducation\b/i },
  { section: "Experience", pattern: /\b(experience|work history|employment)\b/i },
  { section: "Projects", pattern: /\bprojects?\b/i },
  { section: "Skills", pattern: /\b(technical skills|skills)\b/i },
  { section: "Certifications", pattern: /\bcertifications?\b/i },
  { section: "Summary", pattern: /\b(summary|objective|profile)\b/i },
];

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.35;
  return Math.min(1, Math.max(0, value));
}

function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const t = item.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

async function buildSkillNormalizer() {
  const masterSkills = await getActiveTechSkills();
  const canonicalByLower = new Map<string, string>();
  for (const skill of masterSkills) {
    canonicalByLower.set(skill.name.toLowerCase(), skill.name);
  }
  for (const [alias, canonical] of Object.entries(SKILL_ALIASES)) {
    canonicalByLower.set(alias, canonical);
  }

  function normalize(raw: string): string {
    const trimmed = raw.trim();
    return canonicalByLower.get(trimmed.toLowerCase()) ?? trimmed;
  }

  function findInText(text: string): string[] {
    const lower = text.toLowerCase();
    const found: string[] = [];
    for (const skill of masterSkills) {
      const pattern = new RegExp(
        `\\b${skill.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "i"
      );
      if (pattern.test(lower)) found.push(normalize(skill.name));
    }
    for (const [alias, canonical] of Object.entries(SKILL_ALIASES)) {
      if (new RegExp(`\\b${alias}\\b`, "i").test(lower)) found.push(canonical);
    }
    return uniqueStrings(found);
  }

  return { normalize, findInText, masterNames: masterSkills.map((s) => s.name) };
}

export async function buildResumeTruthWarnings(
  studentId: string,
  detectedSkills: string[],
  options?: { githubDetected?: boolean; resumeText?: string }
): Promise<string[]> {
  const [techSkills, roleInterests, student, githubProfile, codingEvidence] =
    await Promise.all([
    getStudentTechSkills(studentId),
    getStudentRoleInterests(studentId),
    prisma.student.findUnique({
      where: { id: studentId },
      select: { linkedinUrl: true, githubUrl: true },
    }),
    getGitHubProfileForStudent(studentId),
    getCodingEvidenceForResumeTruth(studentId),
  ]);

  if (!student) return [];

  const warnings: string[] = [];
  const detectedLower = new Set(detectedSkills.map((s) => s.toLowerCase()));
  const stackNames = techSkills.map((s) => s.skillName);
  const stackLower = new Set(stackNames.map((s) => s.toLowerCase()));
  const verified = techSkills.filter(
    (s) =>
      s.verificationStatus === "FACULTY_VERIFIED" ||
      s.verificationStatus === "PERFORMANCE_VERIFIED"
  );

  for (const skill of detectedSkills) {
    if (!stackLower.has(skill.toLowerCase())) {
      warnings.push(
        `Resume mentions ${skill}, but this skill is not recorded in the student's tech stack.`
      );
    } else if (
      githubProfile?.syncStatus === "SYNCED" &&
      githubProfile.topLanguages.some(
        (l) => l.name.toLowerCase() === skill.toLowerCase()
      )
    ) {
      warnings.push(
        `Supporting evidence: ${skill} appears in both resume and synced GitHub language activity.`
      );
    }
  }

  for (const skill of stackNames) {
    if (!detectedLower.has(skill.toLowerCase())) {
      warnings.push(
        `${skill} is in the tech stack but was not detected in the resume text.`
      );
    }
  }

  for (const skill of techSkills) {
    if (
      detectedLower.has(skill.skillName.toLowerCase()) &&
      skill.verificationStatus === "SELF_DECLARED" ||
      skill.verificationStatus === "NOT_VERIFIED"
    ) {
      warnings.push(
        `Resume mentions ${skill.skillName}, but this skill is not faculty-verified in the tech stack.`
      );
    }
  }

  for (const skill of verified) {
    if (!detectedLower.has(skill.skillName.toLowerCase())) {
      warnings.push(
        `${skill.skillName} is faculty-verified but missing from the resume.`
      );
    }
  }

  if (student.linkedinUrl && !/\blinkedin\b/i.test([...detectedSkills].join(" "))) {
    // linkedin detection handled separately in analysis
  }

  const githubDetected =
    options?.githubDetected ??
    Boolean(student.githubUrl?.trim());

  if (
    (student.githubUrl || githubDetected) &&
    githubProfile?.syncStatus !== "SYNCED"
  ) {
    warnings.push(
      "Student has a GitHub URL on profile but GitHub evidence is not synced. Consider syncing the GitHub profile."
    );
  }

  if (githubProfile?.syncStatus === "SYNCED") {
    const githubLangs = githubProfile.topLanguages.slice(0, 6);
    for (const lang of githubLangs) {
      if (!detectedLower.has(lang.name.toLowerCase())) {
        warnings.push(
          `GitHub shows ${lang.name} activity but it was not detected in the resume. Consider adding it if relevant.`
        );
      }
    }
  }

  const resumeText = options?.resumeText ?? "";
  const codingMentions = detectCodingPlatformsInText(
    `${resumeText} ${detectedSkills.join(" ")}`
  );
  const profilePlatforms = codingEvidence.platformNames;

  for (const mention of codingMentions) {
    const matched = profilePlatforms.some(
      (p) => p.toLowerCase().includes(mention.toLowerCase()) ||
        mention.toLowerCase().includes(p.toLowerCase())
    );
    if (matched) {
      warnings.push(
        `Supporting evidence: resume mentions ${mention} and a matching coding profile is recorded.`
      );
    }
  }

  if (codingEvidence.hasStrongEvidence) {
    const unmentioned = profilePlatforms.filter(
      (p) =>
        !codingMentions.some((m) =>
          p.toLowerCase().includes(m.toLowerCase())
        )
    );
    for (const platform of unmentioned.slice(0, 2)) {
      warnings.push(
        `Strong ${platform} profile on record but not mentioned in resume. Consider adding it.`
      );
    }
  }

  const claimsCompetitive =
    /\bcompetitive programming\b/i.test(resumeText) ||
    /\bcodechef\b/i.test(resumeText) ||
    /\bcodeforces\b/i.test(resumeText);
  if (claimsCompetitive && !codingEvidence.hasStrongEvidence) {
    warnings.push(
      "Resume suggests competitive programming activity but no verified coding platform evidence is on file."
    );
  }

  const primaryInterest = roleInterests[0]?.roleName;
  if (primaryInterest && detectedSkills.length > 0) {
    const interestLower = primaryInterest.toLowerCase();
    const hasOverlap = detectedSkills.some((s) =>
      interestLower.includes(s.toLowerCase())
    );
    if (!hasOverlap && roleInterests.length > 0) {
      warnings.push(
        `Primary role interest "${primaryInterest}" may not align with detected resume skills.`
      );
    }
  }

  return uniqueStrings(warnings).slice(0, 12);
}

function detectMissingSections(text: string): string[] {
  const missing: string[] = [];
  for (const { section, pattern } of SECTION_PATTERNS) {
    if (!pattern.test(text)) missing.push(section);
  }
  return missing;
}

function detectAtsIssues(text: string): string[] {
  const issues: string[] = [];
  if (text.includes("|") || text.includes("┌")) {
    issues.push("Table-like formatting may reduce ATS parsing accuracy.");
  }
  if (/[^\x00-\x7F]/.test(text.slice(0, 500))) {
    issues.push("Special characters detected near the top — verify ATS readability.");
  }
  if (!/\b\d{10}\b/.test(text) && !/@/.test(text)) {
    issues.push("Contact email or phone not clearly detected.");
  }
  if (text.length < 400) {
    issues.push("Resume text is very short — may lack sufficient detail.");
  }
  return issues;
}

function estimateResumeScore(input: {
  detectedSkills: string[];
  missingSections: string[];
  atsIssues: string[];
  hasLinkedIn: boolean;
  hasGitHub: boolean;
  hasProjects: boolean;
  hasCertifications: boolean;
}): number {
  let score = 45;
  score += Math.min(25, input.detectedSkills.length * 3);
  score -= input.missingSections.length * 4;
  score -= input.atsIssues.length * 3;
  if (input.hasLinkedIn) score += 5;
  if (input.hasGitHub) score += 5;
  if (input.hasProjects) score += 8;
  if (input.hasCertifications) score += 5;
  return Math.min(95, Math.max(20, Math.round(score)));
}

export async function analyzeResumeWithFallback(
  text: string,
  studentId: string,
  studentLinkedIn: string | null,
  studentGitHub: string | null
): Promise<ResumeInsightAnalysis> {
  const { findInText } = await buildSkillNormalizer();
  const detectedSkills = findInText(text);
  const missingSections = detectMissingSections(text);
  const atsIssues = detectAtsIssues(text);
  const linkedInDetected =
    /\blinkedin\b/i.test(text) || /\blinkedin\.com\b/i.test(text);
  const githubDetected =
    /\bgithub\b/i.test(text) || /\bgithub\.com\b/i.test(text);
  const projectsDetected = /\bprojects?\b/i.test(text);
  const certificationsDetected = /\bcertifications?\b/i.test(text);
  const atsFriendlyEstimate = atsIssues.length <= 1;

  const resumeTruthWarnings = await buildResumeTruthWarnings(
    studentId,
    detectedSkills,
    { githubDetected, resumeText: text }
  );

  if (studentLinkedIn && !linkedInDetected) {
    resumeTruthWarnings.push(
      "Student profile has a LinkedIn URL, but LinkedIn was not detected in resume text."
    );
  }
  if (studentGitHub && !githubDetected) {
    resumeTruthWarnings.push(
      "Student profile has a GitHub URL, but GitHub was not detected in resume text."
    );
  }

  const suggestedResumeScore = estimateResumeScore({
    detectedSkills,
    missingSections,
    atsIssues,
    hasLinkedIn: linkedInDetected,
    hasGitHub: githubDetected,
    hasProjects: projectsDetected,
    hasCertifications: certificationsDetected,
  });

  const roleSuitability: RoleSuitabilityItem[] = detectedSkills.length
    ? [
        {
          role: "Software Engineer",
          fit: detectedSkills.length >= 4 ? "moderate" : "weak",
          reason: "Based on detected technical skills in resume text.",
        },
      ]
    : [];

  const improvementSuggestions: string[] = [];
  if (missingSections.includes("Projects")) {
    improvementSuggestions.push("Add a dedicated Projects section with measurable outcomes.");
  }
  if (missingSections.includes("Skills")) {
    improvementSuggestions.push("Add a clear Skills section aligned with placement requirements.");
  }
  if (!linkedInDetected) {
    improvementSuggestions.push("Include a LinkedIn profile link if available.");
  }
  if (atsIssues.length > 0) {
    improvementSuggestions.push("Simplify formatting for ATS compatibility.");
  }

  const confidenceScore = clampConfidence(
    0.3 +
      (detectedSkills.length > 0 ? 0.15 : 0) +
      (text.length > 300 ? 0.1 : 0) +
      (missingSections.length < 4 ? 0.1 : 0)
  );

  return resumeInsightAnalysisSchema.parse({
    detectedSkills,
    possibleMissingSkills: [],
    missingSections,
    atsIssues,
    improvementSuggestions,
    roleSuitability,
    linkedInDetected,
    githubDetected,
    projectsDetected,
    certificationsDetected,
    atsFriendlyEstimate,
    suggestedResumeScore,
    confidenceScore,
    resumeTruthWarnings: uniqueStrings(resumeTruthWarnings),
    summary:
      "Rule-based resume analysis. Review all suggestions before applying to the official resume review.",
    provider: "rules",
    aiEnabled: getAiConfig().isEnabled,
  }) as ResumeInsightAnalysis;
}

const AI_SYSTEM_PROMPT = `You analyze student resumes for college placement offices.
Return ONLY valid JSON:
{
  "detectedSkills": string[],
  "possibleMissingSkills": string[],
  "missingSections": string[],
  "atsIssues": string[],
  "improvementSuggestions": string[],
  "roleSuitability": [{ "role": string, "fit": "strong"|"moderate"|"weak", "reason": string }],
  "linkedInDetected": boolean,
  "githubDetected": boolean,
  "projectsDetected": boolean,
  "certificationsDetected": boolean,
  "atsFriendlyEstimate": boolean,
  "suggestedResumeScore": number 0-100 or null,
  "confidenceScore": number 0-1,
  "resumeTruthWarnings": string[],
  "summary": string
}
Be conservative. Do not invent skills not supported by the resume text.`;

export async function analyzeResumeWithAI(
  text: string,
  studentId: string,
  contextNote: string
): Promise<ResumeInsightAnalysis> {
  const raw = await completeJsonWithOpenAi(
    AI_SYSTEM_PROMPT,
    `${contextNote}\n\nResume text:\n${text}`
  );
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const truthWarnings = await buildResumeTruthWarnings(
    studentId,
    Array.isArray(parsed.detectedSkills)
      ? (parsed.detectedSkills as string[])
      : [],
    {
      githubDetected: Boolean(parsed.githubDetected),
      resumeText: text,
    }
  );

  const mergedWarnings = uniqueStrings([
    ...(Array.isArray(parsed.resumeTruthWarnings)
      ? (parsed.resumeTruthWarnings as string[])
      : []),
    ...truthWarnings,
  ]);

  const { normalize } = await buildSkillNormalizer();

  return resumeInsightAnalysisSchema.parse({
    detectedSkills: Array.isArray(parsed.detectedSkills)
      ? (parsed.detectedSkills as string[]).map(normalize)
      : [],
    possibleMissingSkills: Array.isArray(parsed.possibleMissingSkills)
      ? (parsed.possibleMissingSkills as string[]).map(normalize)
      : [],
    missingSections: Array.isArray(parsed.missingSections)
      ? (parsed.missingSections as string[])
      : [],
    atsIssues: Array.isArray(parsed.atsIssues)
      ? (parsed.atsIssues as string[])
      : [],
    improvementSuggestions: Array.isArray(parsed.improvementSuggestions)
      ? (parsed.improvementSuggestions as string[])
      : [],
    roleSuitability: Array.isArray(parsed.roleSuitability)
      ? (parsed.roleSuitability as RoleSuitabilityItem[])
      : [],
    linkedInDetected: Boolean(parsed.linkedInDetected),
    githubDetected: Boolean(parsed.githubDetected),
    projectsDetected: Boolean(parsed.projectsDetected),
    certificationsDetected: Boolean(parsed.certificationsDetected),
    atsFriendlyEstimate: Boolean(parsed.atsFriendlyEstimate),
    suggestedResumeScore:
      typeof parsed.suggestedResumeScore === "number"
        ? parsed.suggestedResumeScore
        : null,
    confidenceScore: clampConfidence(
      typeof parsed.confidenceScore === "number" ? parsed.confidenceScore : 0.72
    ),
    resumeTruthWarnings: mergedWarnings,
    summary:
      typeof parsed.summary === "string"
        ? parsed.summary
        : "AI-assisted resume analysis. Review before applying.",
    provider: "openai",
    aiEnabled: true,
  }) as ResumeInsightAnalysis;
}

function mapInsightRecord(row: {
  id: string;
  resumeId: string;
  studentId: string;
  provider: string;
  confidenceScore: number;
  detectedSkillsJson: string;
  missingSectionsJson: string;
  atsIssuesJson: string;
  improvementSuggestionsJson: string;
  roleSuitabilityJson: string;
  resumeTruthWarningsJson: string;
  summary: string | null;
  linkedInDetected: boolean;
  githubDetected: boolean;
  projectsDetected: boolean;
  certificationsDetected: boolean;
  atsFriendlyEstimate: boolean;
  suggestedResumeScore: number | null;
  reviewedByUserId: string | null;
  reviewStatus: string;
  appliedToResumeReview: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ResumeInsightRecord {
  const detectedSkills = JSON.parse(row.detectedSkillsJson) as string[];
  return {
    id: row.id,
    resumeId: row.resumeId,
    studentId: row.studentId,
    provider: row.provider as ResumeInsightRecord["provider"],
    confidenceScore: row.confidenceScore,
    detectedSkills,
    possibleMissingSkills: [],
    missingSections: JSON.parse(row.missingSectionsJson) as string[],
    atsIssues: JSON.parse(row.atsIssuesJson) as string[],
    improvementSuggestions: JSON.parse(
      row.improvementSuggestionsJson
    ) as string[],
    roleSuitability: JSON.parse(row.roleSuitabilityJson) as RoleSuitabilityItem[],
    resumeTruthWarnings: JSON.parse(row.resumeTruthWarningsJson) as string[],
    summary: row.summary,
    linkedInDetected: row.linkedInDetected,
    githubDetected: row.githubDetected,
    projectsDetected: row.projectsDetected,
    certificationsDetected: row.certificationsDetected,
    atsFriendlyEstimate: row.atsFriendlyEstimate,
    suggestedResumeScore: row.suggestedResumeScore,
    reviewedByUserId: row.reviewedByUserId,
    reviewStatus: row.reviewStatus as ResumeInsightReviewStatus,
    appliedToResumeReview: row.appliedToResumeReview,
    aiEnabled: getAiConfig().isEnabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function persistInsight(
  resumeId: string,
  studentId: string,
  analysis: ResumeInsightAnalysis,
  rawTextPreview: string | null
): Promise<ResumeInsightRecord> {
  const row = await prisma.resumeInsight.create({
    data: {
      resumeId,
      studentId,
      provider: analysis.provider,
      confidenceScore: analysis.confidenceScore,
      detectedSkillsJson: JSON.stringify(analysis.detectedSkills),
      missingSectionsJson: JSON.stringify(analysis.missingSections),
      atsIssuesJson: JSON.stringify(analysis.atsIssues),
      improvementSuggestionsJson: JSON.stringify(analysis.improvementSuggestions),
      roleSuitabilityJson: JSON.stringify(analysis.roleSuitability),
      resumeTruthWarningsJson: JSON.stringify(analysis.resumeTruthWarnings),
      summary: analysis.summary,
      rawTextPreview,
      linkedInDetected: analysis.linkedInDetected,
      githubDetected: analysis.githubDetected,
      projectsDetected: analysis.projectsDetected,
      certificationsDetected: analysis.certificationsDetected,
      atsFriendlyEstimate: analysis.atsFriendlyEstimate,
      suggestedResumeScore: analysis.suggestedResumeScore,
      reviewStatus: "GENERATED",
    },
  });
  return mapInsightRecord(row);
}

export async function analyzeResume(resumeId: string): Promise<ResumeInsightRecord> {
  const { buffer, resume } = await getResumeFileBuffer(resumeId);
  if (!resume.isActive) throw new Error("Resume not found");

  const student = await prisma.student.findUnique({
    where: { id: resume.studentId },
    select: { linkedinUrl: true, githubUrl: true, fullName: true, branch: true },
  });
  if (!student) throw new Error("Student not found");

  let text = "";
  let preview: string | null = null;
  let extractionWarning = "";

  try {
    const extracted = await extractResumeText(
      buffer,
      resume.mimeType,
      resume.originalFileName
    );
    text = textForAiPrompt(extracted.text, extracted.truncated);
    preview = resumeTextPreview(extracted.text);
  } catch (error) {
    if (error instanceof ResumeTextExtractionError) {
      extractionWarning = error.message;
      text = "";
      preview = null;
    } else {
      throw error;
    }
  }

  const contextNote = `Student: ${student.fullName}, Branch: ${student.branch}. ${
    extractionWarning ? `Extraction note: ${extractionWarning}` : ""
  }`;

  let analysis: ResumeInsightAnalysis;
  const config = getAiConfig();

  if (config.isEnabled && text) {
    try {
      analysis = await analyzeResumeWithAI(text, resume.studentId, contextNote);
    } catch (error) {
      if (error instanceof AiProviderError) {
        analysis = await analyzeResumeWithFallback(
          text,
          resume.studentId,
          student.linkedinUrl,
          student.githubUrl
        );
        analysis.improvementSuggestions = [
          "AI parsing unavailable — fallback analysis used.",
          ...analysis.improvementSuggestions,
        ];
      } else {
        throw error;
      }
    }
  } else if (text) {
    analysis = await analyzeResumeWithFallback(
      text,
      resume.studentId,
      student.linkedinUrl,
      student.githubUrl
    );
  } else {
    analysis = await analyzeResumeWithFallback(
      `${student.fullName} ${student.branch}`,
      resume.studentId,
      student.linkedinUrl,
      student.githubUrl
    );
    analysis.summary =
      "Limited analysis — resume text could not be extracted. Suggestions are based on profile metadata and tech stack.";
    analysis.confidenceScore = 0.25;
    analysis.improvementSuggestions = [
      extractionWarning || "Re-upload a text-based PDF or DOCX for richer insights.",
      ...analysis.improvementSuggestions,
    ];
  }

  if (!config.isEnabled) {
    analysis.improvementSuggestions = [
      "AI is not configured — basic rule-based insights only.",
      ...analysis.improvementSuggestions,
    ];
  }

  return persistInsight(resumeId, resume.studentId, analysis, preview);
}

export async function getResumeInsights(
  resumeId: string
): Promise<ResumeInsightRecord | null> {
  const row = await prisma.resumeInsight.findFirst({
    where: { resumeId, reviewStatus: { not: "DISMISSED" } },
    orderBy: { createdAt: "desc" },
  });
  return row ? mapInsightRecord(row) : null;
}

export async function getLatestInsightsForResumes(resumeIds: string[]) {
  if (resumeIds.length === 0) return new Map<string, ResumeInsightRecord>();

  const rows = await prisma.resumeInsight.findMany({
    where: { resumeId: { in: resumeIds }, reviewStatus: { not: "DISMISSED" } },
    orderBy: { createdAt: "desc" },
  });

  const map = new Map<string, ResumeInsightRecord>();
  for (const row of rows) {
    if (!map.has(row.resumeId)) {
      map.set(row.resumeId, mapInsightRecord(row));
    }
  }
  return map;
}

export async function markInsightReviewed(
  insightId: string,
  userId: string,
  status: ResumeInsightReviewStatus = "REVIEWED"
): Promise<ResumeInsightRecord> {
  const row = await prisma.resumeInsight.update({
    where: { id: insightId },
    data: {
      reviewStatus: status,
      reviewedByUserId: userId,
    },
  });
  return mapInsightRecord(row);
}

export async function dismissInsight(
  insightId: string,
  userId: string
): Promise<ResumeInsightRecord> {
  return markInsightReviewed(insightId, userId, "DISMISSED");
}

export async function applyInsightToResumeReview(
  insightId: string,
  userId: string
): Promise<{ insight: ResumeInsightRecord; resumeId: string; studentId: string }> {
  const insight = await prisma.resumeInsight.findUnique({
    where: { id: insightId },
  });
  if (!insight) throw new Error("Resume insight not found");
  if (insight.reviewStatus === "DISMISSED") {
    throw new Error("This insight was dismissed and cannot be applied.");
  }

  const resume = await prisma.resume.findUnique({
    where: { id: insight.resumeId },
  });
  if (!resume || !resume.isActive) throw new Error("Resume not found");

  const providerLabel =
    insight.provider === "openai" ? "AI-assisted" : "Fallback-generated";
  const applyNote = [
    `[${providerLabel} resume insight — review before final approval]`,
    insight.summary ?? "",
    insight.improvementSuggestionsJson
      ? `Suggestions: ${(JSON.parse(insight.improvementSuggestionsJson) as string[]).slice(0, 3).join("; ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const mergedComments = [resume.reviewerComments, applyNote]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 2000);

  await reviewResume(
    insight.resumeId,
    {
      reviewStatus:
        resume.reviewStatus === "UPLOADED"
          ? "UNDER_REVIEW"
          : (resume.reviewStatus as
              | "UNDER_REVIEW"
              | "REVIEWED"
              | "NEEDS_IMPROVEMENT"
              | "APPROVED"),
      resumeScore: insight.suggestedResumeScore ?? resume.resumeScore,
      atsFriendly: insight.atsFriendlyEstimate,
      hasLinkedIn: insight.linkedInDetected,
      hasGitHub: insight.githubDetected,
      hasProjects: insight.projectsDetected,
      hasCertifications: insight.certificationsDetected,
      reviewerComments: mergedComments,
    },
    userId
  );

  const updated = await prisma.resumeInsight.update({
    where: { id: insightId },
    data: {
      reviewStatus: "APPLIED",
      appliedToResumeReview: true,
      reviewedByUserId: userId,
    },
  });

  await triggerReadinessRecalculation(insight.studentId);

  return {
    insight: mapInsightRecord(updated),
    resumeId: insight.resumeId,
    studentId: insight.studentId,
  };
}

export { ResumeTextExtractionError };

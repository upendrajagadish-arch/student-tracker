import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/services/audit";
import { getActiveResumeForStudent } from "@/lib/services/resumes";
import { getLatestInsightsForResumes } from "@/lib/services/resume-insights";
import { getStudentTechSkills } from "@/lib/services/tech-stack";
import { VERIFIED_STATUSES } from "@/lib/tech-constants";
import type { UserRole } from "@/types";
import type {
  CompanySkillEvidenceFit,
  CompanySkillEvidenceRow,
  EvidenceSource,
  EvidenceStrength,
  HrSafeEvidenceSummary,
  SkillEvidenceDashboardStats,
  SkillEvidenceFilters,
  SkillEvidenceItem,
  SkillEvidenceOverviewResult,
  StudentSkillEvidenceBundle,
} from "@/types/skill-evidence";
import type { VerificationStatus } from "@/types/tech-stack";
import type { PassportEvidenceSummary } from "@/types/passport";

/** Prevents concurrent snapshot rebuilds for the same student (e.g. parallel company-fit calls). */
const generationLocks = new Map<string, Promise<StudentSkillEvidenceBundle>>();

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function normalizeSkillKey(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9+#.]/g, "");
}

function skillsMatch(a: string, b: string): boolean {
  const na = normalizeSkillKey(a);
  const nb = normalizeSkillKey(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 3 && nb.length >= 3 && (na.includes(nb) || nb.includes(na))) {
    return true;
  }
  return false;
}

function isFacultyVerified(status: VerificationStatus): boolean {
  return status === "FACULTY_VERIFIED" || status === "PERFORMANCE_VERIFIED";
}

export interface EvidenceInput {
  sources: EvidenceSource[];
  facultyVerified: boolean;
  resumeMentioned: boolean;
  githubEvidence: boolean;
  githubStrong: boolean;
  codingPlatformEvidence: boolean;
  codingStrong: boolean;
  companyRequirementEvidence: boolean;
  projectEvidence: boolean;
  certificationEvidence: boolean;
  confidenceScore: number;
  isRequiredMissing?: boolean;
  selfDeclaredOnly?: boolean;
}

export function calculateEvidenceStrength(input: EvidenceInput): EvidenceStrength {
  if (input.isRequiredMissing) return "NONE";

  const externalSources = [
    input.resumeMentioned,
    input.githubEvidence,
    input.codingPlatformEvidence,
    input.projectEvidence,
    input.certificationEvidence,
    input.companyRequirementEvidence,
  ].filter(Boolean).length;

  if (input.facultyVerified && externalSources >= 1) return "VERIFIED";

  if (
    externalSources >= 2 ||
    (input.githubStrong && input.githubEvidence) ||
    (input.codingStrong && input.codingPlatformEvidence) ||
    (input.githubEvidence && input.codingPlatformEvidence)
  ) {
    return "STRONG";
  }

  if (
    externalSources >= 1 ||
    (input.resumeMentioned && input.sources.includes("SELF_DECLARED"))
  ) {
    return "MODERATE";
  }

  if (input.selfDeclaredOnly || input.sources.includes("SELF_DECLARED")) {
    return "WEAK";
  }

  return "NONE";
}

function suggestAction(
  strength: EvidenceStrength,
  sources: EvidenceSource[],
  facultyVerified: boolean
): string | null {
  if (strength === "VERIFIED") return null;
  if (strength === "NONE") {
    return "Add this skill to the tech stack and collect supporting evidence.";
  }
  if (strength === "WEAK") {
    if (!facultyVerified) {
      return "Request faculty verification or link GitHub/coding platform evidence.";
    }
    return "Add external proof via GitHub repos, coding platforms, or resume projects.";
  }
  if (strength === "MODERATE") {
    if (!sources.includes("FACULTY_VERIFIED")) {
      return "Strengthen with faculty verification or additional platform evidence.";
    }
    return "Add a second evidence source (GitHub, coding platform, or project).";
  }
  if (strength === "STRONG") {
    if (!facultyVerified) {
      return "Consider faculty verification to reach verified status.";
    }
    return null;
  }
  return null;
}

interface SkillAccumulator {
  skillName: string;
  skillCategory: string | null;
  techSkillId: string | null;
  proficiencyLevel: string | null;
  verificationStatus: VerificationStatus | null;
  sources: Set<EvidenceSource>;
  facultyVerified: boolean;
  resumeMentioned: boolean;
  githubEvidence: boolean;
  githubStrong: boolean;
  codingPlatformEvidence: boolean;
  codingStrong: boolean;
  companyRequirementEvidence: boolean;
  projectEvidence: boolean;
  certificationEvidence: boolean;
  confidenceScores: number[];
  notes: string[];
  isRequiredMissing: boolean;
}

function mapRowToItem(row: {
  id: string;
  studentId: string;
  skillName: string;
  skillCategory: string | null;
  techSkillId: string | null;
  evidenceSourcesJson: string;
  evidenceStrength: string;
  confidenceScore: number;
  facultyVerified: boolean;
  resumeMentioned: boolean;
  githubEvidence: boolean;
  codingPlatformEvidence: boolean;
  companyRequirementEvidence: boolean;
  projectEvidence: boolean;
  certificationEvidence: boolean;
  suggestedAction: string | null;
  notes: string | null;
  updatedAt: Date;
}): SkillEvidenceItem {
  return {
    id: row.id,
    studentId: row.studentId,
    skillName: row.skillName,
    skillCategory: row.skillCategory,
    techSkillId: row.techSkillId,
    evidenceSources: parseJsonArray(row.evidenceSourcesJson) as EvidenceSource[],
    evidenceStrength: row.evidenceStrength as EvidenceStrength,
    confidenceScore: row.confidenceScore,
    facultyVerified: row.facultyVerified,
    resumeMentioned: row.resumeMentioned,
    githubEvidence: row.githubEvidence,
    codingPlatformEvidence: row.codingPlatformEvidence,
    companyRequirementEvidence: row.companyRequirementEvidence,
    projectEvidence: row.projectEvidence,
    certificationEvidence: row.certificationEvidence,
    suggestedAction: row.suggestedAction,
    notes: row.notes,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function loadEvidenceContext(studentId: string) {
  const [
    techSkills,
    resume,
    githubProfile,
    codingProfiles,
    matchSnapshots,
  ] = await Promise.all([
    getStudentTechSkills(studentId),
    getActiveResumeForStudent(studentId),
    prisma.gitHubProfile.findUnique({
      where: { studentId },
      include: { repositories: true },
    }),
    prisma.studentCodingProfile.findMany({
      where: { studentId },
      include: { platform: true },
    }),
    prisma.companyMatchSnapshot.findMany({
      where: { studentId },
      include: {
        requirement: {
          select: {
            requiredSkillsJson: true,
            preferredSkillsJson: true,
            roleTitle: true,
          },
        },
      },
      orderBy: { calculatedAt: "desc" },
      take: 10,
    }),
  ]);

  let resumeInsight = null;
  if (resume) {
    const insights = await getLatestInsightsForResumes([resume.id]);
    resumeInsight = insights.get(resume.id) ?? null;
  }

  const resumeSkills = resumeInsight?.detectedSkills ?? [];
  const missingRequiredSkills = new Set<string>();
  const companyRequiredSkills = new Set<string>();
  const matchedCompanySkills = new Set<string>();

  for (const snap of matchSnapshots) {
    for (const s of parseJsonArray(snap.missingSkillsJson)) {
      missingRequiredSkills.add(s);
    }
    for (const s of parseJsonArray(snap.matchedSkillsJson)) {
      matchedCompanySkills.add(s);
    }
    for (const s of parseJsonArray(
      snap.requirement.requiredSkillsJson
    )) {
      companyRequiredSkills.add(s);
    }
  }

  const githubLanguages = new Set<string>();
  if (githubProfile) {
    for (const lang of parseJsonArray(githubProfile.topLanguagesJson)) {
      if (typeof lang === "object" && lang && "name" in lang) {
        githubLanguages.add(String((lang as { name: string }).name));
      } else {
        githubLanguages.add(String(lang));
      }
    }
    for (const repo of githubProfile.repositories) {
      if (repo.primaryLanguage) githubLanguages.add(repo.primaryLanguage);
      if (repo.languagesJson) {
        try {
          const langs = JSON.parse(repo.languagesJson) as Record<string, number>;
          Object.keys(langs).forEach((l) => githubLanguages.add(l));
        } catch {
          /* ignore */
        }
      }
    }
  }

  const codingLanguages = new Set<string>();
  for (const cp of codingProfiles) {
    for (const lang of parseJsonArray(cp.primaryLanguagesJson)) {
      codingLanguages.add(lang);
    }
  }

  const githubStrong =
    (githubProfile?.evidenceScore ?? 0) >= 50 &&
    githubProfile?.syncStatus === "SYNCED";
  const topCodingScore = codingProfiles.reduce(
    (max, p) => Math.max(max, p.evidenceScore),
    0
  );
  const codingStrong = topCodingScore >= 40;

  return {
    techSkills,
    resume,
    resumeInsight,
    resumeSkills,
    githubProfile,
    githubLanguages,
    githubStrong,
    codingProfiles,
    codingLanguages,
    codingStrong,
    missingRequiredSkills,
    companyRequiredSkills,
    matchedCompanySkills,
    topCodingScore,
  };
}

function getOrCreateSkill(
  map: Map<string, SkillAccumulator>,
  skillName: string
): SkillAccumulator {
  const key = normalizeSkillKey(skillName);
  let existing: SkillAccumulator | undefined;
  for (const [k, v] of map) {
    if (k === key || skillsMatch(v.skillName, skillName)) {
      existing = v;
      break;
    }
  }
  if (existing) return existing;

  const acc: SkillAccumulator = {
    skillName: skillName.trim(),
    skillCategory: null,
    techSkillId: null,
    proficiencyLevel: null,
    verificationStatus: null,
    sources: new Set(),
    facultyVerified: false,
    resumeMentioned: false,
    githubEvidence: false,
    githubStrong: false,
    codingPlatformEvidence: false,
    codingStrong: false,
    companyRequirementEvidence: false,
    projectEvidence: false,
    certificationEvidence: false,
    confidenceScores: [],
    notes: [],
    isRequiredMissing: false,
  };
  map.set(key, acc);
  return acc;
}

function buildSkillEvidenceMap(
  ctx: Awaited<ReturnType<typeof loadEvidenceContext>>
): Map<string, SkillAccumulator> {
  const map = new Map<string, SkillAccumulator>();

  for (const ts of ctx.techSkills) {
    const acc = getOrCreateSkill(map, ts.skillName);
    acc.skillCategory = ts.skillCategory;
    acc.techSkillId = ts.techSkillId;
    acc.proficiencyLevel = ts.proficiencyLevel;
    acc.verificationStatus = ts.verificationStatus;
    acc.sources.add("SELF_DECLARED");

    if (isFacultyVerified(ts.verificationStatus)) {
      acc.facultyVerified = true;
      acc.sources.add("FACULTY_VERIFIED");
    } else if (VERIFIED_STATUSES.includes(ts.verificationStatus)) {
      acc.sources.add("FACULTY_VERIFIED");
      if (ts.verificationStatus === "RESUME_EVIDENCE") {
        acc.resumeMentioned = true;
        acc.sources.add("RESUME_MENTIONED");
      }
      if (ts.verificationStatus === "GITHUB_EVIDENCE") {
        acc.githubEvidence = true;
        acc.sources.add("GITHUB_LANGUAGE");
      }
    }

    for (const rs of ctx.resumeSkills) {
      if (skillsMatch(ts.skillName, rs)) {
        acc.resumeMentioned = true;
        acc.sources.add("RESUME_MENTIONED");
        if (ctx.resumeInsight) {
          acc.confidenceScores.push(ctx.resumeInsight.confidenceScore * 0.7);
        }
      }
    }

    for (const gl of ctx.githubLanguages) {
      if (skillsMatch(ts.skillName, gl)) {
        acc.githubEvidence = true;
        acc.githubStrong = ctx.githubStrong;
        acc.sources.add("GITHUB_LANGUAGE");
        if (ctx.githubProfile) {
          acc.confidenceScores.push(
            Math.min(ctx.githubProfile.evidenceScore / 100, 0.85)
          );
        }
      }
    }

    for (const repo of ctx.githubProfile?.repositories ?? []) {
      const repoLangs = [repo.primaryLanguage].filter(Boolean) as string[];
      if (repo.languagesJson) {
        try {
          repoLangs.push(...Object.keys(JSON.parse(repo.languagesJson)));
        } catch {
          /* ignore */
        }
      }
      for (const rl of repoLangs) {
        if (skillsMatch(ts.skillName, rl)) {
          acc.githubEvidence = true;
          acc.sources.add("GITHUB_REPOSITORY");
          if ((repo.projectQualityScore ?? 0) >= 40) {
            acc.projectEvidence = true;
            acc.sources.add("PROJECT_EVIDENCE");
          }
        }
      }
    }

    for (const cl of ctx.codingLanguages) {
      if (skillsMatch(ts.skillName, cl)) {
        acc.codingPlatformEvidence = true;
        acc.codingStrong = ctx.codingStrong;
        acc.sources.add("CODING_PLATFORM");
        acc.confidenceScores.push(Math.min(ctx.topCodingScore / 100, 0.8));
      }
    }

    for (const ms of ctx.matchedCompanySkills) {
      if (skillsMatch(ts.skillName, ms)) {
        acc.companyRequirementEvidence = true;
        acc.sources.add("COMPANY_REQUIREMENT_MATCH");
      }
    }
  }

  for (const rs of ctx.resumeSkills) {
    const inStack = ctx.techSkills.some((ts) => skillsMatch(ts.skillName, rs));
    if (!inStack) {
      const acc = getOrCreateSkill(map, rs);
      acc.resumeMentioned = true;
      acc.sources.add("RESUME_MENTIONED");
      if (ctx.resumeInsight) {
        acc.confidenceScores.push(ctx.resumeInsight.confidenceScore * 0.5);
      }
      acc.notes.push("Detected on resume but not in tech stack.");
    }
  }

  if (ctx.resume?.hasCertifications || ctx.resumeInsight?.certificationsDetected) {
    for (const acc of map.values()) {
      if (acc.resumeMentioned) {
        acc.certificationEvidence = true;
        acc.sources.add("CERTIFICATION_EVIDENCE");
      }
    }
  }

  if (ctx.resume?.hasProjects || ctx.resumeInsight?.projectsDetected) {
    for (const acc of map.values()) {
      if (acc.resumeMentioned && !acc.projectEvidence) {
        acc.projectEvidence = true;
        acc.sources.add("PROJECT_EVIDENCE");
      }
    }
  }

  for (const missing of ctx.missingRequiredSkills) {
    const inStack = ctx.techSkills.some((ts) => skillsMatch(ts.skillName, missing));
    if (!inStack) {
      const acc = getOrCreateSkill(map, missing);
      acc.isRequiredMissing = true;
      acc.sources.add("COMPANY_REQUIREMENT_MATCH");
      acc.companyRequirementEvidence = true;
      acc.notes.push("Required by company match but missing from tech stack.");
    }
  }

  return map;
}

export async function generateSkillEvidenceForStudent(
  studentId: string,
  options?: { actorUserId?: string; actorRole?: UserRole; skipAudit?: boolean }
): Promise<StudentSkillEvidenceBundle> {
  const ctx = await loadEvidenceContext(studentId);
  const skillMap = buildSkillEvidenceMap(ctx);

  const snapshots: Array<{
    studentId: string;
    skillName: string;
    skillCategory: string | null;
    techSkillId: string | null;
    evidenceSourcesJson: string;
    evidenceStrength: EvidenceStrength;
    confidenceScore: number;
    facultyVerified: boolean;
    resumeMentioned: boolean;
    githubEvidence: boolean;
    codingPlatformEvidence: boolean;
    companyRequirementEvidence: boolean;
    projectEvidence: boolean;
    certificationEvidence: boolean;
    suggestedAction: string | null;
    notes: string | null;
  }> = [];

  for (const acc of skillMap.values()) {
    const sources = Array.from(acc.sources);
    const selfDeclaredOnly =
      sources.length === 1 && sources[0] === "SELF_DECLARED";
    const avgConfidence =
      acc.confidenceScores.length > 0
        ? acc.confidenceScores.reduce((a, b) => a + b, 0) /
          acc.confidenceScores.length
        : selfDeclaredOnly
          ? 0.2
          : acc.facultyVerified
            ? 0.75
            : 0.4;

    const strength = calculateEvidenceStrength({
      sources,
      facultyVerified: acc.facultyVerified,
      resumeMentioned: acc.resumeMentioned,
      githubEvidence: acc.githubEvidence,
      githubStrong: acc.githubStrong,
      codingPlatformEvidence: acc.codingPlatformEvidence,
      codingStrong: acc.codingStrong,
      companyRequirementEvidence: acc.companyRequirementEvidence,
      projectEvidence: acc.projectEvidence,
      certificationEvidence: acc.certificationEvidence,
      confidenceScore: avgConfidence,
      isRequiredMissing: acc.isRequiredMissing,
      selfDeclaredOnly,
    });

    snapshots.push({
      studentId,
      skillName: acc.skillName,
      skillCategory: acc.skillCategory,
      techSkillId: acc.techSkillId,
      evidenceSourcesJson: JSON.stringify(sources),
      evidenceStrength: strength,
      confidenceScore: Math.round(avgConfidence * 100) / 100,
      facultyVerified: acc.facultyVerified,
      resumeMentioned: acc.resumeMentioned,
      githubEvidence: acc.githubEvidence,
      codingPlatformEvidence: acc.codingPlatformEvidence,
      companyRequirementEvidence: acc.companyRequirementEvidence,
      projectEvidence: acc.projectEvidence,
      certificationEvidence: acc.certificationEvidence,
      suggestedAction: suggestAction(strength, sources, acc.facultyVerified),
      notes: acc.notes.length > 0 ? acc.notes.join(" ") : null,
    });
  }

  await prisma.$transaction([
    prisma.skillEvidenceSnapshot.deleteMany({ where: { studentId } }),
    ...snapshots.map((s) => prisma.skillEvidenceSnapshot.create({ data: s })),
  ]);

  if (!options?.skipAudit && options?.actorUserId) {
    await logAudit({
      actorUserId: options.actorUserId,
      actorRole: options.actorRole ?? null,
      action: "SKILL_EVIDENCE_REFRESHED",
      entityType: "Student",
      entityId: studentId,
      description: `Skill evidence refreshed (${snapshots.length} skills)`,
    });
  }

  return getSkillEvidenceForStudent(studentId);
}

export async function generateSkillEvidenceForManyStudents(
  studentIds: string[],
  options: {
    actorUserId: string;
    actorRole: UserRole;
    onProgress?: (current: number, total: number) => Promise<void>;
  }
): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;

  for (let i = 0; i < studentIds.length; i++) {
    try {
      await generateSkillEvidenceForStudent(studentIds[i], {
        actorUserId: options.actorUserId,
        actorRole: options.actorRole,
        skipAudit: true,
      });
      processed++;
    } catch {
      failed++;
    }
    await options.onProgress?.(i + 1, studentIds.length);
  }

  await logAudit({
    actorUserId: options.actorUserId,
    actorRole: options.actorRole,
    action: "SKILL_EVIDENCE_BULK_REFRESH_COMPLETED",
    entityType: "Job",
    entityId: options.actorUserId,
    description: `Bulk skill evidence refresh: ${processed} processed, ${failed} failed of ${studentIds.length}`,
  });

  return { processed, failed };
}

export async function getSkillEvidenceForStudent(
  studentId: string
): Promise<StudentSkillEvidenceBundle> {
  const rows = await prisma.skillEvidenceSnapshot.findMany({
    where: { studentId },
    orderBy: [{ evidenceStrength: "desc" }, { skillName: "asc" }],
  });

  const items = rows.map(mapRowToItem);
  const lastRefreshedAt =
    rows.length > 0
      ? new Date(Math.max(...rows.map((r) => r.updatedAt.getTime()))).toISOString()
      : null;

  const claimed = items.filter((i) => i.techSkillId != null);
  const summary = {
    totalClaimed: claimed.length,
    verifiedCount: items.filter((i) => i.evidenceStrength === "VERIFIED").length,
    strongCount: items.filter(
      (i) => i.evidenceStrength === "STRONG" || i.evidenceStrength === "VERIFIED"
    ).length,
    weakCount: items.filter((i) => i.evidenceStrength === "WEAK").length,
    missingRequiredCount: items.filter(
      (i) => i.evidenceStrength === "NONE" && i.companyRequirementEvidence
    ).length,
  };

  return { studentId, summary, items, lastRefreshedAt };
}

export async function ensureSkillEvidenceForStudent(
  studentId: string,
  options?: { actorUserId?: string; actorRole?: UserRole }
): Promise<StudentSkillEvidenceBundle> {
  const existing = await getSkillEvidenceForStudent(studentId);
  if (existing.items.length > 0) return existing;

  let pending = generationLocks.get(studentId);
  if (!pending) {
    pending = generateSkillEvidenceForStudent(studentId, {
      actorUserId: options?.actorUserId,
      actorRole: options?.actorRole,
      skipAudit: !options?.actorUserId,
    }).finally(() => {
      generationLocks.delete(studentId);
    });
    generationLocks.set(studentId, pending);
  }
  return pending;
}

export async function getSkillEvidenceOverview(
  filters: SkillEvidenceFilters = {}
): Promise<SkillEvidenceOverviewResult> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;

  const students = await prisma.student.findMany({
    where: {
      ...(filters.branch ? { branch: filters.branch } : {}),
      ...(filters.batch ? { batch: filters.batch } : {}),
      ...(filters.search
        ? {
            OR: [
              { fullName: { contains: filters.search } },
              { rollNumber: { contains: filters.search } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      fullName: true,
      rollNumber: true,
      branch: true,
      batch: true,
      skillEvidenceSnapshots: {
        ...(filters.evidenceStrength
          ? { where: { evidenceStrength: filters.evidenceStrength } }
          : {}),
        ...(filters.skillCategory
          ? { where: { skillCategory: filters.skillCategory } }
          : {}),
      },
    },
    orderBy: { fullName: "asc" },
  });

  let items = students.map((s) => {
    const snaps = s.skillEvidenceSnapshots;
    const claimed = snaps.filter((sn) => sn.techSkillId != null);
    return {
      studentId: s.id,
      fullName: s.fullName,
      rollNumber: s.rollNumber,
      branch: s.branch,
      batch: s.batch,
      totalSkills: claimed.length,
      verifiedCount: snaps.filter((sn) => sn.evidenceStrength === "VERIFIED").length,
      strongCount: snaps.filter(
        (sn) =>
          sn.evidenceStrength === "STRONG" || sn.evidenceStrength === "VERIFIED"
      ).length,
      weakCount: snaps.filter((sn) => sn.evidenceStrength === "WEAK").length,
      avgConfidence:
        snaps.length > 0
          ? snaps.reduce((sum, sn) => sum + sn.confidenceScore, 0) / snaps.length
          : 0,
      lastRefreshedAt:
        snaps.length > 0
          ? new Date(
              Math.max(...snaps.map((sn) => sn.updatedAt.getTime()))
            ).toISOString()
          : null,
    };
  });

  if (filters.evidenceStrength || filters.skillCategory) {
    items = items.filter((i) => i.totalSkills > 0 || i.verifiedCount > 0);
  }

  const total = items.length;
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);

  return {
    items: paged,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getMissingEvidenceActions(
  studentId: string
): Promise<string[]> {
  const bundle = await getSkillEvidenceForStudent(studentId);
  return bundle.items
    .filter((i) => i.suggestedAction)
    .map((i) => `${i.skillName}: ${i.suggestedAction}`)
    .slice(0, 15);
}

export async function getCompanySkillEvidenceFit(
  studentId: string,
  requirementId: string
): Promise<CompanySkillEvidenceFit | null> {
  const requirement = await prisma.companyRequirement.findUnique({
    where: { id: requirementId },
    include: { company: { select: { name: true } } },
  });
  if (!requirement) return null;

  const bundle = await getSkillEvidenceForStudent(studentId);

  const evidenceBySkill = new Map<string, SkillEvidenceItem>();
  for (const item of bundle.items) {
    evidenceBySkill.set(normalizeSkillKey(item.skillName), item);
  }

  function findEvidence(skillName: string): SkillEvidenceItem | null {
    for (const [key, item] of evidenceBySkill) {
      if (key === normalizeSkillKey(skillName) || skillsMatch(item.skillName, skillName)) {
        return item;
      }
    }
    return null;
  }

  function toRow(skillName: string, required: boolean): CompanySkillEvidenceRow {
    const ev = findEvidence(skillName);
    if (ev) {
      return {
        skillName,
        evidenceStrength: ev.evidenceStrength,
        evidenceSources: ev.evidenceSources,
        inTechStack: ev.techSkillId != null,
        suggestedAction: ev.suggestedAction,
      };
    }
    return {
      skillName,
      evidenceStrength: required ? "NONE" : "WEAK",
      evidenceSources: required ? ["COMPANY_REQUIREMENT_MATCH"] : [],
      inTechStack: false,
      suggestedAction: required
        ? "Required skill missing — add to tech stack and verify."
        : "Preferred skill not evidenced — consider adding proof.",
    };
  }

  const requiredSkills = parseJsonArray(requirement.requiredSkillsJson).map((s) =>
    toRow(s, true)
  );
  const preferredSkills = parseJsonArray(requirement.preferredSkillsJson).map(
    (s) => toRow(s, false)
  );

  const missingRequired = requiredSkills
    .filter((r) => r.evidenceStrength === "NONE" || !r.inTechStack)
    .map((r) => r.skillName);

  const weakEvidenceSkills = [...requiredSkills, ...preferredSkills]
    .filter((r) => r.evidenceStrength === "WEAK" || r.evidenceStrength === "NONE")
    .map((r) => r.skillName);

  const verifiedMatching = [...requiredSkills, ...preferredSkills]
    .filter(
      (r) =>
        r.evidenceStrength === "VERIFIED" || r.evidenceStrength === "STRONG"
    )
    .map((r) => r.skillName);

  return {
    requirementId,
    roleTitle: requirement.roleTitle,
    companyName: requirement.company.name,
    requiredSkills,
    preferredSkills,
    missingRequired,
    weakEvidenceSkills: [...new Set(weakEvidenceSkills)],
    verifiedMatching: [...new Set(verifiedMatching)],
  };
}

export async function getHrSafeEvidenceSummary(
  studentId: string
): Promise<HrSafeEvidenceSummary> {
  const bundle = await ensureSkillEvidenceForStudent(studentId);

  const verifiedSkills = bundle.items
    .filter((i) => i.evidenceStrength === "VERIFIED" || i.facultyVerified)
    .map((i) => i.skillName)
    .slice(0, 8);

  const strongEvidenceSkills = bundle.items
    .filter(
      (i) =>
        i.evidenceStrength === "STRONG" &&
        !verifiedSkills.includes(i.skillName)
    )
    .map((i) => i.skillName)
    .slice(0, 6);

  const skillsNeedingProof = bundle.items
    .filter((i) => i.evidenceStrength === "WEAK" || i.evidenceStrength === "NONE")
    .map((i) => i.skillName)
    .slice(0, 4);

  const [github, codingProfiles] = await Promise.all([
    prisma.gitHubProfile.findUnique({ where: { studentId } }),
    prisma.studentCodingProfile.findMany({
      where: { studentId },
      include: { platform: true },
      orderBy: { evidenceScore: "desc" },
      take: 3,
    }),
  ]);

  const githubSummary =
    github && github.syncStatus === "SYNCED"
      ? `GitHub @${github.username} — evidence score ${Math.round(github.evidenceScore)}`
      : null;

  const codingPlatformSummary =
    codingProfiles.length > 0
      ? codingProfiles
          .map(
            (p) =>
              `${p.platform.name}${p.totalProblemsSolved != null ? ` (${p.totalProblemsSolved} solved)` : ""}`
          )
          .join(" · ")
      : null;

  return {
    verifiedSkills,
    strongEvidenceSkills,
    skillsNeedingProof: [], // HR should not see internal gaps per spec
    githubSummary,
    codingPlatformSummary,
  };
}

export async function getSkillEvidenceDashboardStats(): Promise<SkillEvidenceDashboardStats> {
  const snapshots = await prisma.skillEvidenceSnapshot.findMany({
    select: {
      skillName: true,
      evidenceStrength: true,
      studentId: true,
      student: { select: { branch: true } },
      techSkillId: true,
      suggestedAction: true,
    },
  });

  const studentsWithStrong = new Set<string>();
  const weakSkillCounts = new Map<string, number>();
  const verifiedSkillCounts = new Map<string, number>();
  const branchMap = new Map<string, { strong: number; weak: number; students: Set<string> }>();
  const missingAreaCounts = new Map<string, number>();

  for (const s of snapshots) {
    branchMap.set(s.student.branch, branchMap.get(s.student.branch) ?? {
      strong: 0,
      weak: 0,
      students: new Set(),
    });
    const branch = branchMap.get(s.student.branch)!;
    branch.students.add(s.studentId);

    if (s.evidenceStrength === "STRONG" || s.evidenceStrength === "VERIFIED") {
      studentsWithStrong.add(s.studentId);
      branch.strong++;
    }
    if (s.evidenceStrength === "WEAK" && s.techSkillId) {
      weakSkillCounts.set(s.skillName, (weakSkillCounts.get(s.skillName) ?? 0) + 1);
      branch.weak++;
    }
    if (s.evidenceStrength === "VERIFIED") {
      verifiedSkillCounts.set(
        s.skillName,
        (verifiedSkillCounts.get(s.skillName) ?? 0) + 1
      );
    }
    if (s.evidenceStrength === "NONE" && s.suggestedAction) {
      missingAreaCounts.set(
        s.skillName,
        (missingAreaCounts.get(s.skillName) ?? 0) + 1
      );
    }
  }

  const sortDesc = (m: Map<string, number>) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([skill, count]) => ({ skill, count }));

  return {
    studentsWithStrongEvidence: studentsWithStrong.size,
    weaklyEvidencedSkills: sortDesc(weakSkillCounts),
    topVerifiedSkills: sortDesc(verifiedSkillCounts),
    branchEvidence: [...branchMap.entries()].map(([branch, data]) => ({
      branch,
      strong: data.strong,
      weak: data.weak,
      students: data.students.size,
    })),
    topMissingAreas: sortDesc(missingAreaCounts).map(({ skill, count }) => ({
      area: skill,
      count,
    })),
  };
}

export async function resolveStudentIdsForBulkRefresh(filters: {
  branch?: string;
  batch?: string;
  studentIds?: string[];
}): Promise<string[]> {
  if (filters.studentIds?.length) return filters.studentIds;
  const students = await prisma.student.findMany({
    where: {
      ...(filters.branch ? { branch: filters.branch } : {}),
      ...(filters.batch ? { batch: filters.batch } : {}),
    },
    select: { id: true },
  });
  return students.map((s) => s.id);
}

export async function buildPassportEvidenceSummary(
  studentId: string,
  companyRequirementId?: string | null
): Promise<PassportEvidenceSummary> {
  const bundle = await ensureSkillEvidenceForStudent(studentId);

  const topVerifiedSkills = bundle.items
    .filter((i) => i.evidenceStrength === "VERIFIED" || i.facultyVerified)
    .map((i) => i.skillName)
    .slice(0, 6);

  const strongEvidenceSkills = bundle.items
    .filter(
      (i) =>
        i.evidenceStrength === "STRONG" &&
        !topVerifiedSkills.includes(i.skillName)
    )
    .map((i) => i.skillName)
    .slice(0, 5);

  const skillsNeedingProof = bundle.items
    .filter((i) => i.evidenceStrength === "WEAK" || i.evidenceStrength === "NONE")
    .map((i) => i.skillName)
    .slice(0, 4);

  let companyFitEvidence: PassportEvidenceSummary["companyFitEvidence"];
  if (companyRequirementId) {
    const fit = await getCompanySkillEvidenceFit(studentId, companyRequirementId);
    if (fit) {
      companyFitEvidence = {
        roleTitle: fit.roleTitle,
        verifiedMatching: fit.verifiedMatching.slice(0, 6),
        missingRequired: fit.missingRequired.slice(0, 5),
      };
    }
  }

  return {
    topVerifiedSkills,
    strongEvidenceSkills,
    skillsNeedingProof,
    ...(companyFitEvidence ? { companyFitEvidence } : {}),
  };
}

import { prisma } from "@/lib/db";
import { MATCH_SCORE_WEIGHTS } from "@/lib/company-constants";
import { VERIFIED_STATUSES } from "@/lib/tech-constants";
import { RESUME_REVIEW_STATUS_LABELS } from "@/lib/resume-constants";
import type {
  CompanyMatchFilters,
  CompanyMatchItem,
  CompanyMatchSummary,
  CompanyMatchingDashboardStats,
  CompanyRequirementDetail,
  EligibilityStatus,
  MatchStatus,
  StudentCompanyMatchItem,
} from "@/types/company";
import type { PaginatedResult } from "@/types";
import type { VerificationStatus } from "@/types/tech-stack";
import { Prisma } from "@prisma/client";

export interface RequirementCriteria {
  eligibleBranches: string[];
  eligibleBatches: string[];
  graduationYear: number | null;
  minCgpa: number | null;
  allowActiveBacklogs: boolean;
  maxActiveBacklogs: number;
  requiredSkills: string[];
  preferredSkills: string[];
  requiredRoleInterests: string[];
  minTechnicalScore: number;
  minCommunicationScore: number;
  minResumeScore: number;
  minReadinessScore: number;
  requireResumeApproved: boolean;
  requireAtsFriendly: boolean;
  requireLinkedIn: boolean;
  requireGitHub: boolean;
}

export interface StudentMatchContext {
  id: string;
  fullName: string;
  rollNumber: string;
  email: string;
  phone: string | null;
  branch: string;
  batch: string;
  graduationYear: number;
  cgpa: number | null;
  activeBacklogs: number;
  linkedinUrl: string | null;
  githubUrl: string | null;
  technicalScore: number;
  communicationScore: number;
  readinessScore: number;
  skillNames: { name: string; verified: boolean }[];
  roleInterests: string[];
  resume: {
    resumeScore: number;
    reviewStatus: string;
    atsFriendly: boolean;
  } | null;
}

export interface MatchCalculationResult {
  matchScore: number;
  matchStatus: MatchStatus;
  eligibilityStatus: EligibilityStatus;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  risks: string[];
  reasons: string[];
}

function normalizeSkillName(name: string): string {
  return name.trim().toLowerCase();
}

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function clampScore(score: number): number {
  return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
}

export function requirementToCriteria(
  requirement: CompanyRequirementDetail | {
    eligibleBranchesJson?: string;
    eligibleBatchesJson?: string;
    requiredSkillsJson?: string;
    preferredSkillsJson?: string;
    requiredRoleInterestsJson?: string;
    graduationYear?: number | null;
    minCgpa?: number | null;
    allowActiveBacklogs?: boolean;
    maxActiveBacklogs?: number;
    minTechnicalScore?: number;
    minCommunicationScore?: number;
    minResumeScore?: number;
    minReadinessScore?: number;
    requireResumeApproved?: boolean;
    requireAtsFriendly?: boolean;
    requireLinkedIn?: boolean;
    requireGitHub?: boolean;
    eligibleBranches?: string[];
    eligibleBatches?: string[];
    requiredSkills?: string[];
    preferredSkills?: string[];
    requiredRoleInterests?: string[];
  }
): RequirementCriteria {
  const hasJson = "eligibleBranchesJson" in requirement;
  return {
    eligibleBranches: hasJson
      ? parseJsonArray(requirement.eligibleBranchesJson ?? "[]")
      : (requirement.eligibleBranches ?? []),
    eligibleBatches: hasJson
      ? parseJsonArray(requirement.eligibleBatchesJson ?? "[]")
      : (requirement.eligibleBatches ?? []),
    requiredSkills: hasJson
      ? parseJsonArray(requirement.requiredSkillsJson ?? "[]")
      : (requirement.requiredSkills ?? []),
    preferredSkills: hasJson
      ? parseJsonArray(requirement.preferredSkillsJson ?? "[]")
      : (requirement.preferredSkills ?? []),
    requiredRoleInterests: hasJson
      ? parseJsonArray(requirement.requiredRoleInterestsJson ?? "[]")
      : (requirement.requiredRoleInterests ?? []),
    graduationYear: requirement.graduationYear ?? null,
    minCgpa: requirement.minCgpa ?? null,
    allowActiveBacklogs: requirement.allowActiveBacklogs ?? false,
    maxActiveBacklogs: requirement.maxActiveBacklogs ?? 0,
    minTechnicalScore: requirement.minTechnicalScore ?? 0,
    minCommunicationScore: requirement.minCommunicationScore ?? 0,
    minResumeScore: requirement.minResumeScore ?? 0,
    minReadinessScore: requirement.minReadinessScore ?? 0,
    requireResumeApproved: requirement.requireResumeApproved ?? false,
    requireAtsFriendly: requirement.requireAtsFriendly ?? false,
    requireLinkedIn: requirement.requireLinkedIn ?? false,
    requireGitHub: requirement.requireGitHub ?? false,
  };
}

function matchSkills(
  requiredNames: string[],
  studentSkills: { name: string; verified: boolean }[]
): { matched: string[]; missing: string[]; ratio: number; verifiedBonus: number } {
  if (requiredNames.length === 0) {
    return { matched: [], missing: [], ratio: 1, verifiedBonus: 0 };
  }

  const studentMap = new Map(
    studentSkills.map((s) => [normalizeSkillName(s.name), s])
  );

  const matched: string[] = [];
  const missing: string[] = [];
  let verifiedCount = 0;

  for (const skill of requiredNames) {
    const found = studentMap.get(normalizeSkillName(skill));
    if (found) {
      matched.push(found.name);
      if (found.verified) verifiedCount++;
    } else {
      missing.push(skill);
    }
  }

  const ratio = matched.length / requiredNames.length;
  const verifiedBonus =
    matched.length > 0 ? (verifiedCount / matched.length) * 0.15 : 0;

  return { matched, missing, ratio, verifiedBonus };
}

export function calculateCompanyMatch(
  criteria: RequirementCriteria,
  student: StudentMatchContext
): MatchCalculationResult {
  const reasons: string[] = [];
  const strengths: string[] = [];
  const risks: string[] = [];
  const hardFailures: string[] = [];
  const reviewFlags: string[] = [];

  if (
    criteria.eligibleBranches.length > 0 &&
    !criteria.eligibleBranches.includes(student.branch)
  ) {
    hardFailures.push(`Branch ${student.branch} not in eligible branches`);
  }

  if (
    criteria.eligibleBatches.length > 0 &&
    !criteria.eligibleBatches.includes(student.batch)
  ) {
    hardFailures.push(`Batch ${student.batch} not in eligible batches`);
  }

  if (
    criteria.graduationYear != null &&
    student.graduationYear !== criteria.graduationYear
  ) {
    hardFailures.push(
      `Graduation year ${student.graduationYear} does not match required ${criteria.graduationYear}`
    );
  }

  if (criteria.minCgpa != null) {
    if (student.cgpa == null) {
      reviewFlags.push("CGPA not recorded");
    } else if (student.cgpa < criteria.minCgpa) {
      hardFailures.push(
        `CGPA ${student.cgpa} below minimum ${criteria.minCgpa}`
      );
    } else if (student.cgpa >= criteria.minCgpa) {
      strengths.push(`CGPA ${student.cgpa} meets minimum`);
    }
  }

  if (!criteria.allowActiveBacklogs && student.activeBacklogs > 0) {
    hardFailures.push(`Has ${student.activeBacklogs} active backlog(s)`);
  } else if (
    criteria.allowActiveBacklogs &&
    student.activeBacklogs > criteria.maxActiveBacklogs
  ) {
    hardFailures.push(
      `Active backlogs ${student.activeBacklogs} exceed maximum ${criteria.maxActiveBacklogs}`
    );
  } else if (student.activeBacklogs === 0) {
    strengths.push("No active backlogs");
  }

  const resumeScore = student.resume?.resumeScore ?? 0;

  if (criteria.requireResumeApproved) {
    if (!student.resume || student.resume.reviewStatus !== "APPROVED") {
      hardFailures.push("Approved resume required");
    } else {
      strengths.push("Resume approved");
    }
  }

  if (criteria.requireAtsFriendly) {
    if (!student.resume?.atsFriendly) {
      hardFailures.push("ATS-friendly resume required");
    } else {
      strengths.push("ATS-friendly resume");
    }
  }

  if (criteria.requireLinkedIn && !student.linkedinUrl?.trim()) {
    hardFailures.push("LinkedIn profile required");
  } else if (student.linkedinUrl?.trim()) {
    strengths.push("LinkedIn profile present");
  }

  if (criteria.requireGitHub && !student.githubUrl?.trim()) {
    hardFailures.push("GitHub profile required");
  } else if (student.githubUrl?.trim()) {
    strengths.push("GitHub profile present");
  }

  if (student.technicalScore < criteria.minTechnicalScore) {
    hardFailures.push(
      `Technical score ${student.technicalScore} below minimum ${criteria.minTechnicalScore}`
    );
  } else if (criteria.minTechnicalScore > 0) {
    strengths.push(`Technical score ${student.technicalScore} meets minimum`);
  }

  if (student.communicationScore < criteria.minCommunicationScore) {
    hardFailures.push(
      `Communication score ${student.communicationScore} below minimum ${criteria.minCommunicationScore}`
    );
  } else if (criteria.minCommunicationScore > 0) {
    strengths.push(
      `Communication score ${student.communicationScore} meets minimum`
    );
  }

  if (resumeScore < criteria.minResumeScore) {
    hardFailures.push(
      `Resume score ${resumeScore} below minimum ${criteria.minResumeScore}`
    );
  } else if (criteria.minResumeScore > 0 && student.resume) {
    strengths.push(`Resume score ${resumeScore} meets minimum`);
  }

  if (student.readinessScore < criteria.minReadinessScore) {
    if (student.readinessScore === 0 && criteria.minReadinessScore > 0) {
      reviewFlags.push("Readiness not yet calculated");
    }
    hardFailures.push(
      `Readiness score ${student.readinessScore} below minimum ${criteria.minReadinessScore}`
    );
  } else if (criteria.minReadinessScore > 0) {
    strengths.push(
      `Readiness score ${student.readinessScore} meets minimum`
    );
  }

  if (criteria.requiredRoleInterests.length > 0) {
    const studentRoles = student.roleInterests.map((r) =>
      normalizeSkillName(r)
    );
    const hasRole = criteria.requiredRoleInterests.some((role) =>
      studentRoles.includes(normalizeSkillName(role))
    );
    if (!hasRole) {
      hardFailures.push("Required role interest not found");
    } else {
      strengths.push("Matching role interest found");
    }
  }

  const requiredMatch = matchSkills(criteria.requiredSkills, student.skillNames);
  const preferredMatch = matchSkills(
    criteria.preferredSkills,
    student.skillNames
  );

  if (requiredMatch.missing.length > 0) {
    risks.push(`Missing required skills: ${requiredMatch.missing.join(", ")}`);
  }
  if (requiredMatch.matched.length > 0) {
    strengths.push(
      `Matched ${requiredMatch.matched.length}/${criteria.requiredSkills.length || 0} required skills`
    );
  }
  if (preferredMatch.matched.length > 0) {
    strengths.push(
      `Matched ${preferredMatch.matched.length} preferred skill(s)`
    );
  }

  const allHardPassed = hardFailures.length === 0;
  let eligibilityStatus: EligibilityStatus;
  if (!allHardPassed) {
    eligibilityStatus = "NOT_ELIGIBLE";
    reasons.push(...hardFailures);
  } else if (reviewFlags.length > 0) {
    eligibilityStatus = "NEEDS_REVIEW";
    reasons.push(...reviewFlags);
  } else {
    eligibilityStatus = "ELIGIBLE";
    reasons.push("Meets all eligibility criteria");
  }

  const eligibilityComponent = allHardPassed
    ? MATCH_SCORE_WEIGHTS.eligibilityBase
    : 0;

  const requiredSkillComponent =
    criteria.requiredSkills.length === 0
      ? MATCH_SCORE_WEIGHTS.requiredSkills
      : clampScore(
          requiredMatch.ratio *
            MATCH_SCORE_WEIGHTS.requiredSkills *
            (1 + requiredMatch.verifiedBonus)
        );

  const preferredSkillComponent =
    criteria.preferredSkills.length === 0
      ? MATCH_SCORE_WEIGHTS.preferredSkills
      : clampScore(
          preferredMatch.ratio * MATCH_SCORE_WEIGHTS.preferredSkills
        );

  const readinessComponent = clampScore(
    (student.readinessScore / 100) * MATCH_SCORE_WEIGHTS.readiness
  );
  const technicalComponent = clampScore(
    (student.technicalScore / 100) * MATCH_SCORE_WEIGHTS.technical
  );
  const communicationComponent = clampScore(
    (student.communicationScore / 100) * MATCH_SCORE_WEIGHTS.communication
  );
  const resumeComponent = clampScore(
    (resumeScore / 100) * MATCH_SCORE_WEIGHTS.resume
  );

  let matchScore = clampScore(
    eligibilityComponent +
      requiredSkillComponent +
      preferredSkillComponent +
      readinessComponent +
      technicalComponent +
      communicationComponent +
      resumeComponent
  );

  if (!allHardPassed) {
    matchScore = clampScore(Math.min(matchScore, 44));
  }

  let matchStatus: MatchStatus;
  if (!allHardPassed || matchScore < 45) {
    matchStatus = "NOT_FIT";
  } else if (matchScore >= 85) {
    matchStatus = "STRONG_FIT";
  } else if (matchScore >= 75) {
    matchStatus = "GOOD_FIT";
  } else if (matchScore >= 60) {
    matchStatus = "AVERAGE_FIT";
  } else {
    matchStatus = "RISK_FIT";
    if (risks.length === 0 && requiredMatch.missing.length > 0) {
      risks.push("Partial skill match");
    }
  }

  if (eligibilityStatus === "NEEDS_REVIEW" && matchStatus !== "NOT_FIT") {
    matchStatus = "RISK_FIT";
  }

  reasons.push(
    `Match score ${matchScore}: eligibility ${eligibilityComponent}, skills ${clampScore(requiredSkillComponent + preferredSkillComponent)}, readiness ${readinessComponent}, scores ${clampScore(technicalComponent + communicationComponent + resumeComponent)}`
  );

  return {
    matchScore,
    matchStatus,
    eligibilityStatus,
    matchedSkills: [...requiredMatch.matched, ...preferredMatch.matched.filter((s) => !requiredMatch.matched.includes(s))],
    missingSkills: requiredMatch.missing,
    strengths,
    risks,
    reasons,
  };
}

async function loadStudentMatchContexts(): Promise<StudentMatchContext[]> {
  const students = await prisma.student.findMany({
    include: {
      techSkills: {
        include: { techSkill: { select: { name: true } } },
      },
      roleInterests: { select: { roleName: true } },
      readinessSnapshots: {
        orderBy: { calculatedAt: "desc" },
        take: 1,
        select: { overallScore: true },
      },
    },
  });

  const studentIds = students.map((s) => s.id);
  const resumes = await prisma.resume.findMany({
    where: { studentId: { in: studentIds }, isActive: true },
    select: {
      studentId: true,
      resumeScore: true,
      reviewStatus: true,
      atsFriendly: true,
    },
  });
  const resumeMap = new Map(resumes.map((r) => [r.studentId, r]));

  return students.map((student) => {
    const resume = resumeMap.get(student.id) ?? null;
    const latestReadiness =
      student.readinessSnapshots[0]?.overallScore ?? student.readinessScore;

    return {
      id: student.id,
      fullName: student.fullName,
      rollNumber: student.rollNumber,
      email: student.email,
      phone: student.phone,
      branch: student.branch,
      batch: student.batch,
      graduationYear: student.graduationYear,
      cgpa: student.cgpa,
      activeBacklogs: student.activeBacklogs,
      linkedinUrl: student.linkedinUrl,
      githubUrl: student.githubUrl,
      technicalScore: student.technicalScore,
      communicationScore: student.communicationScore,
      readinessScore: latestReadiness,
      skillNames: student.techSkills.map((s) => ({
        name: s.techSkill.name,
        verified: VERIFIED_STATUSES.includes(
          s.verificationStatus as VerificationStatus
        ),
      })),
      roleInterests: student.roleInterests.map((r) => r.roleName),
      resume: resume
        ? {
            resumeScore: resume.resumeScore,
            reviewStatus: resume.reviewStatus,
            atsFriendly: resume.atsFriendly,
          }
        : null,
    };
  });
}

export async function runRequirementMatching(
  requirementId: string
): Promise<{ count: number; summary: CompanyMatchSummary }> {
  return runRequirementMatchingWithProgress(requirementId);
}

export async function runRequirementMatchingWithProgress(
  requirementId: string,
  options?: {
    onProgress?: (current: number, total: number) => void | Promise<void>;
  }
): Promise<{ count: number; summary: CompanyMatchSummary }> {
  const requirement = await prisma.companyRequirement.findUnique({
    where: { id: requirementId },
    include: { company: { select: { name: true } } },
  });
  if (!requirement) throw new Error("Requirement not found");

  const criteria = requirementToCriteria({
    eligibleBranchesJson: requirement.eligibleBranchesJson,
    eligibleBatchesJson: requirement.eligibleBatchesJson,
    requiredSkillsJson: requirement.requiredSkillsJson,
    preferredSkillsJson: requirement.preferredSkillsJson,
    requiredRoleInterestsJson: requirement.requiredRoleInterestsJson,
    graduationYear: requirement.graduationYear,
    minCgpa: requirement.minCgpa,
    allowActiveBacklogs: requirement.allowActiveBacklogs,
    maxActiveBacklogs: requirement.maxActiveBacklogs,
    minTechnicalScore: requirement.minTechnicalScore,
    minCommunicationScore: requirement.minCommunicationScore,
    minResumeScore: requirement.minResumeScore,
    minReadinessScore: requirement.minReadinessScore,
    requireResumeApproved: requirement.requireResumeApproved,
    requireAtsFriendly: requirement.requireAtsFriendly,
    requireLinkedIn: requirement.requireLinkedIn,
    requireGitHub: requirement.requireGitHub,
  });

  const students = await loadStudentMatchContexts();
  const total = students.length;
  const now = new Date();
  const PROGRESS_CHUNK = 100;

  const rows: {
    companyRequirementId: string;
    studentId: string;
    matchScore: number;
    matchStatus: MatchStatus;
    eligibilityStatus: EligibilityStatus;
    matchedSkillsJson: string;
    missingSkillsJson: string;
    strengthsJson: string;
    risksJson: string;
    reasonsJson: string;
    calculatedAt: Date;
  }[] = [];

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const result = calculateCompanyMatch(criteria, student);
    rows.push({
      companyRequirementId: requirementId,
      studentId: student.id,
      matchScore: result.matchScore,
      matchStatus: result.matchStatus,
      eligibilityStatus: result.eligibilityStatus,
      matchedSkillsJson: JSON.stringify(result.matchedSkills),
      missingSkillsJson: JSON.stringify(result.missingSkills),
      strengthsJson: JSON.stringify(result.strengths),
      risksJson: JSON.stringify(result.risks),
      reasonsJson: JSON.stringify(result.reasons),
      calculatedAt: now,
    });

    if (
      options?.onProgress &&
      ((i + 1) % PROGRESS_CHUNK === 0 || i + 1 === total)
    ) {
      await options.onProgress(i + 1, total);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.companyMatchSnapshot.deleteMany({
      where: { companyRequirementId: requirementId },
    });

    const CHUNK = 250;
    for (let i = 0; i < rows.length; i += CHUNK) {
      await tx.companyMatchSnapshot.createMany({
        data: rows.slice(i, i + CHUNK),
      });
    }
  }, { timeout: 120000 });

  const summary = await getMatchSummary(requirementId);
  return { count: students.length, summary };
}

function mapMatchSnapshot(
  match: {
    id: string;
    companyRequirementId: string;
    studentId: string;
    matchScore: number;
    matchStatus: string;
    eligibilityStatus: string;
    matchedSkillsJson: string;
    missingSkillsJson: string;
    strengthsJson: string;
    risksJson: string;
    reasonsJson: string;
    calculatedAt: Date;
    student: {
      fullName: string;
      rollNumber: string;
      branch: string;
      batch: string;
      email: string;
      phone: string | null;
      cgpa: number | null;
      activeBacklogs: number;
      technicalScore: number;
      communicationScore: number;
      readinessScore: number;
      linkedinUrl: string | null;
      githubUrl: string | null;
    };
  },
  resume: { resumeScore: number; reviewStatus: string } | null
): CompanyMatchItem {
  return {
    id: match.id,
    companyRequirementId: match.companyRequirementId,
    studentId: match.studentId,
    studentName: match.student.fullName,
    rollNumber: match.student.rollNumber,
    branch: match.student.branch,
    batch: match.student.batch,
    email: match.student.email,
    phone: match.student.phone,
    cgpa: match.student.cgpa,
    activeBacklogs: match.student.activeBacklogs,
    matchScore: match.matchScore,
    matchStatus: match.matchStatus as MatchStatus,
    eligibilityStatus: match.eligibilityStatus as EligibilityStatus,
    readinessScore: match.student.readinessScore,
    technicalScore: match.student.technicalScore,
    communicationScore: match.student.communicationScore,
    resumeScore: resume?.resumeScore ?? 0,
    resumeReviewStatus: resume
      ? (RESUME_REVIEW_STATUS_LABELS[
          resume.reviewStatus as keyof typeof RESUME_REVIEW_STATUS_LABELS
        ] ?? resume.reviewStatus)
      : null,
    linkedinUrl: match.student.linkedinUrl,
    githubUrl: match.student.githubUrl,
    matchedSkills: parseJsonArray(match.matchedSkillsJson),
    missingSkills: parseJsonArray(match.missingSkillsJson),
    strengths: parseJsonArray(match.strengthsJson),
    risks: parseJsonArray(match.risksJson),
    reasons: parseJsonArray(match.reasonsJson),
    calculatedAt: match.calculatedAt,
  };
}

export async function getMatchSummary(
  requirementId: string
): Promise<CompanyMatchSummary> {
  const matches = await prisma.companyMatchSnapshot.findMany({
    where: { companyRequirementId: requirementId },
    select: {
      matchStatus: true,
      eligibilityStatus: true,
      calculatedAt: true,
    },
  });

  const lastCalculatedAt =
    matches.length > 0
      ? matches.reduce(
          (latest, m) =>
            m.calculatedAt > latest ? m.calculatedAt : latest,
          matches[0].calculatedAt
        )
      : null;

  return {
    totalChecked: matches.length,
    eligible: matches.filter((m) => m.eligibilityStatus === "ELIGIBLE").length,
    strongFit: matches.filter((m) => m.matchStatus === "STRONG_FIT").length,
    goodFit: matches.filter((m) => m.matchStatus === "GOOD_FIT").length,
    averageFit: matches.filter((m) => m.matchStatus === "AVERAGE_FIT").length,
    riskFit: matches.filter((m) => m.matchStatus === "RISK_FIT").length,
    notEligible: matches.filter((m) => m.eligibilityStatus === "NOT_ELIGIBLE")
      .length,
    notFit: matches.filter((m) => m.matchStatus === "NOT_FIT").length,
    lastCalculatedAt,
  };
}

export async function getRequirementMatches(
  requirementId: string,
  filters: CompanyMatchFilters = {}
): Promise<PaginatedResult<CompanyMatchItem>> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 15));
  const skip = (page - 1) * pageSize;

  const where: Prisma.CompanyMatchSnapshotWhereInput = {
    companyRequirementId: requirementId,
  };

  if (filters.matchStatus) where.matchStatus = filters.matchStatus;
  if (filters.eligibilityStatus)
    where.eligibilityStatus = filters.eligibilityStatus;

  const studentWhere: Prisma.StudentWhereInput = {};
  if (filters.branch) studentWhere.branch = filters.branch;
  if (filters.batch) studentWhere.batch = filters.batch;
  if (filters.search) {
    const search = filters.search.trim();
    studentWhere.OR = [
      { fullName: { contains: search } },
      { rollNumber: { contains: search } },
      { email: { contains: search } },
    ];
  }
  if (Object.keys(studentWhere).length > 0) where.student = studentWhere;

  if (filters.minScore != null || filters.maxScore != null) {
    where.matchScore = {};
    if (filters.minScore != null) where.matchScore.gte = filters.minScore;
    if (filters.maxScore != null) where.matchScore.lte = filters.maxScore;
  }

  let matches = await prisma.companyMatchSnapshot.findMany({
    where,
    include: {
      student: true,
    },
    orderBy: [{ matchScore: "desc" }, { calculatedAt: "desc" }],
  });

  if (filters.missingSkill) {
    const needle = normalizeSkillName(filters.missingSkill);
    matches = matches.filter((m) =>
      parseJsonArray(m.missingSkillsJson).some(
        (s) => normalizeSkillName(s) === needle
      )
    );
  }

  const total = matches.length;
  const paged = matches.slice(skip, skip + pageSize);

  const studentIds = paged.map((m) => m.studentId);
  const resumes = await prisma.resume.findMany({
    where: { studentId: { in: studentIds }, isActive: true },
    select: { studentId: true, resumeScore: true, reviewStatus: true },
  });
  const resumeMap = new Map(resumes.map((r) => [r.studentId, r]));

  return {
    data: paged.map((m) =>
      mapMatchSnapshot(m, resumeMap.get(m.studentId) ?? null)
    ),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
}

export async function getStudentCompanyMatches(
  studentId: string,
  limit = 10
): Promise<StudentCompanyMatchItem[]> {
  const matches = await prisma.companyMatchSnapshot.findMany({
    where: { studentId },
    include: {
      requirement: {
        include: { company: { select: { id: true, name: true } } },
      },
    },
    orderBy: { matchScore: "desc" },
    take: limit,
  });

  return matches.map((m) => ({
    id: m.id,
    companyRequirementId: m.companyRequirementId,
    companyId: m.requirement.companyId,
    companyName: m.requirement.company.name,
    roleTitle: m.requirement.roleTitle,
    matchScore: m.matchScore,
    matchStatus: m.matchStatus as MatchStatus,
    eligibilityStatus: m.eligibilityStatus as EligibilityStatus,
    missingSkills: parseJsonArray(m.missingSkillsJson),
    risks: parseJsonArray(m.risksJson),
    calculatedAt: m.calculatedAt,
  }));
}

export async function getCompanyMatchingDashboardStats(): Promise<CompanyMatchingDashboardStats> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [activeRequirements, strongMatchesThisMonth, matches] =
    await Promise.all([
      prisma.companyRequirement.count({ where: { status: "ACTIVE" } }),
      prisma.companyMatchSnapshot.count({
        where: {
          matchStatus: "STRONG_FIT",
          calculatedAt: { gte: startOfMonth },
          requirement: { status: "ACTIVE" },
        },
      }),
      prisma.companyMatchSnapshot.findMany({
        where: { requirement: { status: "ACTIVE" } },
        select: { missingSkillsJson: true },
      }),
    ]);

  const skillCounts = new Map<string, number>();
  for (const match of matches) {
    for (const skill of parseJsonArray(match.missingSkillsJson)) {
      skillCounts.set(skill, (skillCounts.get(skill) ?? 0) + 1);
    }
  }

  const topMissingSkills = [...skillCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([skill, count]) => ({ skill, count }));

  return {
    activeRequirements,
    strongMatchesThisMonth,
    topMissingSkills,
  };
}

export async function getAllMatchesForExport(
  requirementId: string
): Promise<{
  rows: Array<CompanyMatchItem & { companyName: string; roleTitle: string }>;
  total: number;
  truncated: boolean;
  limit: number;
}> {
  const { getExportRowLimit, capRows } = await import("@/lib/export-limits");
  const limit = getExportRowLimit();

  const requirement = await prisma.companyRequirement.findUnique({
    where: { id: requirementId },
    include: { company: { select: { name: true } } },
  });
  if (!requirement) throw new Error("Requirement not found");

  const total = await prisma.companyMatchSnapshot.count({
    where: { companyRequirementId: requirementId },
  });

  const matches = await prisma.companyMatchSnapshot.findMany({
    where: { companyRequirementId: requirementId },
    include: { student: true },
    orderBy: { matchScore: "desc" },
    take: limit,
  });

  const studentIds = matches.map((m) => m.studentId);
  const resumes = await prisma.resume.findMany({
    where: { studentId: { in: studentIds }, isActive: true },
    select: { studentId: true, resumeScore: true, reviewStatus: true },
  });
  const resumeMap = new Map(resumes.map((r) => [r.studentId, r]));

  const rows = matches.map((m) => ({
    ...mapMatchSnapshot(m, resumeMap.get(m.studentId) ?? null),
    companyName: requirement.company.name,
    roleTitle: requirement.roleTitle,
  }));

  const { truncated } = capRows(rows, limit);

  return { rows, total, truncated: truncated || total > limit, limit };
}

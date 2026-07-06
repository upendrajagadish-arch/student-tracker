import { prisma } from "@/lib/db";
import { SKILL_CATEGORY_LABELS, VERIFIED_STATUSES } from "@/lib/tech-constants";
import { getLatestReadinessSnapshot } from "@/lib/services/readiness";
import { getActiveResumeForStudent } from "@/lib/services/resumes";
import {
  getStudentRoleInterests,
  getStudentTechSkills,
} from "@/lib/services/tech-stack";
import {
  canHrViewShare,
  isShareActive,
} from "@/lib/services/student-sharing";
import { buildPassportEvidenceSummary } from "@/lib/services/skill-evidence";
import type {
  EligibilityStatus,
  MatchStatus,
} from "@/types/company";
import type {
  GeneratePassportOptions,
  PassportAcademicSummary,
  PassportEvidenceSummary,
  PassportRecommendations,
  PassportResumeSummary,
  PassportSkillItem,
  PassportSummaryJson,
  PlacementPassportView,
} from "@/types/passport";
import type { ReadinessStatus, RiskLevel } from "@/types/readiness";
import type { HRDecision } from "@/types/sharing";

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function parseJsonObject<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function loadPassportContext(options: GeneratePassportOptions) {
  const student = await prisma.student.findUnique({
    where: { id: options.studentId },
  });
  if (!student) throw new Error("Student not found");

  const [readiness, resume, techSkills, roleInterests] = await Promise.all([
    getLatestReadinessSnapshot(options.studentId),
    getActiveResumeForStudent(options.studentId),
    getStudentTechSkills(options.studentId),
    getStudentRoleInterests(options.studentId),
  ]);

  let company: { id: string; name: string } | null = null;
  let requirement: { id: string; roleTitle: string } | null = null;
  let match: {
    matchScore: number;
    matchStatus: MatchStatus;
    eligibilityStatus: EligibilityStatus;
    matchedSkillsJson: string;
    missingSkillsJson: string;
    strengthsJson: string;
    risksJson: string;
  } | null = null;
  let hrContext: PassportSummaryJson["hr"];

  if (options.companyRequirementId) {
    const req = await prisma.companyRequirement.findUnique({
      where: { id: options.companyRequirementId },
      include: { company: { select: { id: true, name: true } } },
    });
    if (req) {
      company = req.company;
      requirement = { id: req.id, roleTitle: req.roleTitle };
      options.companyId = req.companyId;

      const matchRow = await prisma.companyMatchSnapshot.findUnique({
        where: {
          companyRequirementId_studentId: {
            companyRequirementId: req.id,
            studentId: options.studentId,
          },
        },
      });
      if (matchRow) {
        match = {
          matchScore: matchRow.matchScore,
          matchStatus: matchRow.matchStatus as MatchStatus,
          eligibilityStatus: matchRow.eligibilityStatus as EligibilityStatus,
          matchedSkillsJson: matchRow.matchedSkillsJson,
          missingSkillsJson: matchRow.missingSkillsJson,
          strengthsJson: matchRow.strengthsJson,
          risksJson: matchRow.risksJson,
        };
      }
    }
  }

  if (options.sharedStudentProfileId) {
    const share = await prisma.sharedStudentProfile.findUnique({
      where: { id: options.sharedStudentProfileId },
    });
    if (share) {
      hrContext = {
        hrDecision: share.hrDecision as HRDecision,
        hrComments: share.hrComments,
        sharedAt: share.sharedAt.toISOString(),
      };
      if (!options.companyRequirementId) {
        options.companyRequirementId = share.companyRequirementId;
        options.companyId = share.companyId;
      }
    }
  }

  if (!match && options.companyRequirementId) {
    const matchRow = await prisma.companyMatchSnapshot.findUnique({
      where: {
        companyRequirementId_studentId: {
          companyRequirementId: options.companyRequirementId,
          studentId: options.studentId,
        },
      },
    });
    if (matchRow) {
      match = {
        matchScore: matchRow.matchScore,
        matchStatus: matchRow.matchStatus as MatchStatus,
        eligibilityStatus: matchRow.eligibilityStatus as EligibilityStatus,
        matchedSkillsJson: matchRow.matchedSkillsJson,
        missingSkillsJson: matchRow.missingSkillsJson,
        strengthsJson: matchRow.strengthsJson,
        risksJson: matchRow.risksJson,
      };
    }
  }

  if (!company && options.companyId) {
    company = await prisma.company.findUnique({
      where: { id: options.companyId },
      select: { id: true, name: true },
    });
  }

  if (!requirement && options.companyRequirementId) {
    requirement = await prisma.companyRequirement.findUnique({
      where: { id: options.companyRequirementId },
      select: { id: true, roleTitle: true },
    });
  }

  const strengths: string[] = [];
  const risks: string[] = [];

  if (readiness?.scoreBreakdown.criticalGaps.length) {
    risks.push(...readiness.scoreBreakdown.criticalGaps.slice(0, 5));
  }

  if (match) {
    strengths.push(...parseJsonArray(match.strengthsJson).slice(0, 5));
    const matchRisks = parseJsonArray(match.risksJson);
    for (const r of matchRisks) {
      if (!risks.includes(r)) risks.push(r);
    }
  }

  const verifiedSkills = techSkills.filter((s) =>
    VERIFIED_STATUSES.includes(s.verificationStatus)
  );
  if (verifiedSkills.length >= 3) {
    strengths.push(`${verifiedSkills.length} verified technical skills on record`);
  }
  if (readiness && readiness.overallScore >= 70) {
    strengths.push("Strong overall placement readiness score");
  }
  if (resume?.reviewStatus === "APPROVED") {
    strengths.push("Resume approved by placement office");
  }

  if (student.activeBacklogs > 0) {
    risks.push(`${student.activeBacklogs} active backlog(s)`);
  }
  if (readiness?.riskLevel === "HIGH" || readiness?.riskLevel === "CRITICAL") {
    risks.push(`${readiness.riskLevel.replace("_", " ")} readiness risk level`);
  }

  const summary: PassportSummaryJson = {
    student: {
      fullName: student.fullName,
      rollNumber: student.rollNumber,
      branch: student.branch,
      batch: student.batch,
      graduationYear: student.graduationYear,
      email: student.email,
      phone: student.phone,
    },
    readiness: readiness
      ? {
          overallScore: readiness.overallScore,
          readinessStatus: readiness.readinessStatus,
          riskLevel: readiness.riskLevel,
          technicalReadiness: readiness.technicalReadiness,
          communicationReadiness: readiness.communicationReadiness,
          resumeReadiness: readiness.resumeReadiness,
          techStackReadiness: readiness.techStackReadiness,
          profileReadiness: readiness.profileReadiness,
          academicReadiness: readiness.academicReadiness,
          nextRecommendedAction: readiness.nextRecommendedAction,
        }
      : {
          overallScore: student.readinessScore,
          readinessStatus: "NOT_READY" as ReadinessStatus,
          riskLevel: "HIGH" as RiskLevel,
          technicalReadiness: student.technicalScore,
          communicationReadiness: student.communicationScore,
          resumeReadiness: 0,
          techStackReadiness: 0,
          profileReadiness: 0,
          academicReadiness: 0,
          nextRecommendedAction:
            "Recalculate placement readiness to generate a complete passport.",
        },
    roleInterests: roleInterests.map((r) => r.roleName),
    ...(hrContext ? { hr: hrContext } : {}),
  };

  if (company && requirement && match) {
    summary.company = {
      companyName: company.name,
      roleTitle: requirement.roleTitle,
      matchScore: match.matchScore,
      matchStatus: match.matchStatus,
      eligibilityStatus: match.eligibilityStatus,
      matchedSkills: parseJsonArray(match.matchedSkillsJson),
      missingSkills: parseJsonArray(match.missingSkillsJson),
      risks: parseJsonArray(match.risksJson),
      strengths: parseJsonArray(match.strengthsJson),
    };
  }

  const skills: PassportSkillItem[] = techSkills
    .filter(
      (s) =>
        VERIFIED_STATUSES.includes(s.verificationStatus) ||
        s.verificationStatus === "SELF_DECLARED"
    )
    .slice(0, 12)
    .map((s) => ({
      name: s.skillName,
      category: SKILL_CATEGORY_LABELS[s.skillCategory] ?? s.skillCategory,
      proficiencyLevel: s.proficiencyLevel,
      verificationStatus: s.verificationStatus,
      evidenceSource: s.evidenceSource,
    }));

  const resumeSummary: PassportResumeSummary | null = resume
    ? {
        reviewStatus: resume.reviewStatus,
        resumeScore: resume.resumeScore,
        atsFriendly: resume.atsFriendly,
        hasLinkedIn: resume.hasLinkedIn,
        hasGitHub: resume.hasGitHub,
        hasProjects: resume.hasProjects,
        hasCertifications: resume.hasCertifications,
      }
    : null;

  const academic: PassportAcademicSummary = {
    cgpa: student.cgpa,
    activeBacklogs: student.activeBacklogs,
    graduationYear: student.graduationYear,
    branch: student.branch,
    batch: student.batch,
  };

  const recommendations: PassportRecommendations = {
    nextRecommendedAction: summary.readiness.nextRecommendedAction,
    strengths: strengths.slice(0, 6),
    risks: risks.slice(0, 6),
  };

  const passportTitle = company
    ? `Placement Passport — ${student.fullName} · ${company.name}`
    : `Placement Passport — ${student.fullName}`;

  return {
    passportTitle,
    summary,
    skills,
    resumeSummary,
    academic,
    strengths: recommendations.strengths,
    risks: recommendations.risks,
    recommendations,
    match,
    companyId: options.companyId ?? null,
    companyRequirementId: options.companyRequirementId ?? null,
  };
}

export async function generatePassportSnapshot(
  options: GeneratePassportOptions
): Promise<PlacementPassportView> {
  const ctx = await loadPassportContext(options);

  const snapshot = await prisma.placementPassportSnapshot.create({
    data: {
      studentId: options.studentId,
      companyId: ctx.companyId,
      companyRequirementId: ctx.companyRequirementId,
      sharedStudentProfileId: options.sharedStudentProfileId ?? null,
      generatedByUserId: options.generatedByUserId,
      passportTitle: ctx.passportTitle,
      overallReadinessScore: ctx.summary.readiness.overallScore,
      readinessStatus: ctx.summary.readiness.readinessStatus,
      riskLevel: ctx.summary.readiness.riskLevel,
      companyMatchScore: ctx.match?.matchScore ?? null,
      companyMatchStatus: ctx.match?.matchStatus ?? null,
      eligibilityStatus: ctx.match?.eligibilityStatus ?? null,
      summaryJson: JSON.stringify(ctx.summary),
      skillsJson: JSON.stringify(ctx.skills),
      resumeJson: JSON.stringify(ctx.resumeSummary),
      academicJson: JSON.stringify(ctx.academic),
      strengthsJson: JSON.stringify(ctx.strengths),
      risksJson: JSON.stringify(ctx.risks),
      recommendationsJson: JSON.stringify(ctx.recommendations),
    },
    include: {
      generatedBy: { select: { name: true } },
    },
  });

  const view = mapPassportSnapshot(snapshot, Boolean(options.sharedStudentProfileId));
  return enrichPassportWithEvidence(view, options.companyRequirementId);
}

export async function enrichPassportWithEvidence(
  view: PlacementPassportView,
  companyRequirementId?: string | null
): Promise<PlacementPassportView> {
  const evidence = await buildPassportEvidenceSummary(
    view.studentId,
    companyRequirementId
  );
  return { ...view, evidence };
}

function mapPassportSnapshot(
  snapshot: {
    id: string;
    studentId: string;
    passportTitle: string;
    generatedAt: Date;
    companyMatchScore: number | null;
    companyMatchStatus: string | null;
    eligibilityStatus: string | null;
    summaryJson: string;
    skillsJson: string;
    resumeJson: string;
    academicJson: string;
    strengthsJson: string;
    risksJson: string;
    recommendationsJson: string;
    generatedBy: { name: string };
  },
  showHrBlock: boolean
): PlacementPassportView {
  return {
    id: snapshot.id,
    studentId: snapshot.studentId,
    passportTitle: snapshot.passportTitle,
    generatedAt: snapshot.generatedAt,
    generatedByName: snapshot.generatedBy.name,
    summary: parseJsonObject<PassportSummaryJson>(snapshot.summaryJson, {
      student: {
        fullName: "",
        rollNumber: "",
        branch: "",
        batch: "",
        graduationYear: 0,
        email: "",
        phone: null,
      },
      readiness: {
        overallScore: 0,
        readinessStatus: "NOT_READY",
        riskLevel: "HIGH",
        technicalReadiness: 0,
        communicationReadiness: 0,
        resumeReadiness: 0,
        techStackReadiness: 0,
        profileReadiness: 0,
        academicReadiness: 0,
        nextRecommendedAction: "",
      },
      roleInterests: [],
    }),
    skills: parseJsonObject<PassportSkillItem[]>(snapshot.skillsJson, []),
    resume: parseJsonObject<PassportResumeSummary | null>(
      snapshot.resumeJson,
      null
    ),
    academic: parseJsonObject<PassportAcademicSummary>(snapshot.academicJson, {
      cgpa: null,
      activeBacklogs: 0,
      graduationYear: 0,
      branch: "",
      batch: "",
    }),
    strengths: parseJsonArray(snapshot.strengthsJson),
    risks: parseJsonArray(snapshot.risksJson),
    recommendations: parseJsonObject<PassportRecommendations>(
      snapshot.recommendationsJson,
      { nextRecommendedAction: "", strengths: [], risks: [] }
    ),
    companyMatchScore: snapshot.companyMatchScore,
    companyMatchStatus: snapshot.companyMatchStatus as MatchStatus | null,
    eligibilityStatus: snapshot.eligibilityStatus as EligibilityStatus | null,
    showHrBlock,
  };
}

export async function getPassportSnapshotById(
  id: string,
  showHrBlock = false
): Promise<PlacementPassportView | null> {
  const snapshot = await prisma.placementPassportSnapshot.findUnique({
    where: { id },
    include: { generatedBy: { select: { name: true } } },
  });
  if (!snapshot) return null;
  const view = mapPassportSnapshot(snapshot, showHrBlock);
  return enrichPassportWithEvidence(view, snapshot.companyRequirementId);
}

export async function getLatestPassportForStudent(options: {
  studentId: string;
  companyRequirementId?: string | null;
  sharedStudentProfileId?: string | null;
}): Promise<PlacementPassportView | null> {
  const snapshot = await prisma.placementPassportSnapshot.findFirst({
    where: {
      studentId: options.studentId,
      ...(options.sharedStudentProfileId
        ? { sharedStudentProfileId: options.sharedStudentProfileId }
        : {}),
      ...(options.companyRequirementId && !options.sharedStudentProfileId
        ? { companyRequirementId: options.companyRequirementId }
        : {}),
    },
    orderBy: { generatedAt: "desc" },
    include: { generatedBy: { select: { name: true } } },
  });
  if (!snapshot) return null;
  const view = mapPassportSnapshot(
    snapshot,
    Boolean(options.sharedStudentProfileId)
  );
  return enrichPassportWithEvidence(view, snapshot.companyRequirementId);
}

export type HrPassportAccessResult =
  | { allowed: true; passport: PlacementPassportView }
  | {
      allowed: false;
      reason: "not_enabled" | "denied" | "not_found";
    };

export async function getHrPassportAccess(
  userId: string,
  shareId: string
): Promise<HrPassportAccessResult> {
  const share = await prisma.sharedStudentProfile.findUnique({
    where: { id: shareId },
  });

  if (!share) {
    return { allowed: false, reason: "not_found" };
  }

  if (!share.allowPlacementPassport) {
    return { allowed: false, reason: "not_enabled" };
  }

  const canView = await canHrViewShare(userId, shareId);
  if (!canView) {
    return { allowed: false, reason: "denied" };
  }

  let passport = await getLatestPassportForStudent({
    studentId: share.studentId,
    sharedStudentProfileId: shareId,
  });

  if (!passport) {
    passport = await generatePassportSnapshot({
      studentId: share.studentId,
      generatedByUserId: share.sharedByUserId,
      companyId: share.companyId,
      companyRequirementId: share.companyRequirementId,
      sharedStudentProfileId: shareId,
    });
  }

  return { allowed: true, passport };
}

export async function ensureSharePassportSnapshot(
  shareId: string
): Promise<void> {
  const share = await prisma.sharedStudentProfile.findUnique({
    where: { id: shareId },
  });
  if (!share || !share.allowPlacementPassport || !isShareActive(share)) return;

  const existing = await getLatestPassportForStudent({
    studentId: share.studentId,
    sharedStudentProfileId: shareId,
  });
  if (existing) return;

  await generatePassportSnapshot({
    studentId: share.studentId,
    generatedByUserId: share.sharedByUserId,
    companyId: share.companyId,
    companyRequirementId: share.companyRequirementId,
    sharedStudentProfileId: shareId,
  });
}

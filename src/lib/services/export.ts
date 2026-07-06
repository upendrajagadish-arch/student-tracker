import ExcelJS from "exceljs";
import { PLACEMENT_STATUS_LABELS, RESUME_STATUS_LABELS } from "@/lib/constants";
import { RESUME_REVIEW_STATUS_LABELS } from "@/lib/resume-constants";
import { ROLE_READINESS_LABELS } from "@/lib/tech-constants";
import { READINESS_STATUS_LABELS, RISK_LEVEL_LABELS } from "@/lib/readiness-constants";
import { VERIFIED_STATUSES } from "@/lib/tech-constants";
import { buildStudentWhereClause } from "@/lib/services/students";
import { getActiveResumesForStudents } from "@/lib/services/resumes";
import { prisma } from "@/lib/db";
import { assertExportWithinLimit, getExportRowLimit } from "@/lib/export-limits";
import type { PlacementStatus, ResumeReviewStatus, StudentFilters } from "@/types";

const EXPORT_COLUMNS = [
  { header: "Full Name", key: "fullName", width: 24 },
  { header: "Roll Number", key: "rollNumber", width: 16 },
  { header: "Email", key: "email", width: 28 },
  { header: "Phone", key: "phone", width: 16 },
  { header: "Branch", key: "branch", width: 22 },
  { header: "Section", key: "section", width: 10 },
  { header: "Batch", key: "batch", width: 14 },
  { header: "Graduation Year", key: "graduationYear", width: 16 },
  { header: "CGPA", key: "cgpa", width: 8 },
  { header: "Active Backlogs", key: "activeBacklogs", width: 16 },
  { header: "Placement Status", key: "placementStatus", width: 18 },
  { header: "Resume Status", key: "resumeStatus", width: 16 },
  { header: "Resume Uploaded", key: "resumeUploaded", width: 16 },
  { header: "Resume Review Status", key: "resumeReviewStatus", width: 20 },
  { header: "Resume Score", key: "resumeScore", width: 14 },
  { header: "ATS Friendly", key: "atsFriendly", width: 12 },
  { header: "Resume File Name", key: "resumeFileName", width: 28 },
  { header: "Download Available", key: "downloadAvailable", width: 18 },
  { header: "Technical Score", key: "technicalScore", width: 16 },
  { header: "Communication Score", key: "communicationScore", width: 20 },
  { header: "LinkedIn URL", key: "linkedinUrl", width: 32 },
  { header: "GitHub URL", key: "githubUrl", width: 32 },
  { header: "GitHub Synced", key: "githubSynced", width: 14 },
  { header: "GitHub Evidence Score", key: "githubEvidenceScore", width: 20 },
  { header: "Top GitHub Languages", key: "topGitHubLanguages", width: 28 },
  { header: "Last GitHub Sync", key: "lastGitHubSync", width: 20 },
  { header: "Coding Profiles Linked", key: "codingProfilesLinked", width: 20 },
  { header: "Top Coding Platform", key: "topCodingPlatform", width: 22 },
  { header: "Total Problems Solved", key: "totalCodingProblemsSolved", width: 20 },
  { header: "Coding Evidence Score", key: "codingEvidenceScore", width: 20 },
  { header: "Coding Verification Status", key: "codingVerificationStatus", width: 24 },
  { header: "Strong Evidence Skills", key: "strongEvidenceSkills", width: 32 },
  { header: "Weak Evidence Skills", key: "weakEvidenceSkills", width: 32 },
  { header: "Verified Evidence Count", key: "verifiedEvidenceCount", width: 22 },
  { header: "Missing Evidence Actions", key: "missingEvidenceActions", width: 40 },
  { header: "Top Tech Skills", key: "topTechSkills", width: 36 },
  { header: "Verified Skills Count", key: "verifiedSkillsCount", width: 20 },
  { header: "Primary Role Interest", key: "primaryRoleInterest", width: 24 },
  { header: "Role Readiness Level", key: "roleReadinessLevel", width: 20 },
  { header: "Overall Readiness Score", key: "overallReadinessScore", width: 24 },
  { header: "Readiness Status", key: "readinessStatus", width: 18 },
  { header: "Risk Level", key: "riskLevel", width: 14 },
  { header: "Technical Readiness", key: "technicalReadiness", width: 18 },
  { header: "Communication Readiness", key: "communicationReadiness", width: 22 },
  { header: "Resume Readiness", key: "resumeReadiness", width: 16 },
  { header: "Tech Stack Readiness", key: "techStackReadiness", width: 20 },
  { header: "Profile Readiness", key: "profileReadiness", width: 16 },
  { header: "Academic Readiness", key: "academicReadiness", width: 18 },
  { header: "Next Recommended Action", key: "nextRecommendedAction", width: 36 },
] as const;

export interface StudentExportMeta {
  totalRows: number;
  exportedRows: number;
  truncated: boolean;
  limit: number;
}

export async function exportStudentsToExcel(
  filters: StudentFilters = {}
): Promise<{ buffer: Buffer; meta: StudentExportMeta }> {
  const where = buildStudentWhereClause(filters);
  const limit = getExportRowLimit();

  const totalRows = await prisma.student.count({ where });
  assertExportWithinLimit(totalRows, limit);

  const students = await prisma.student.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const studentIds = students.map((s) => s.id);
  const resumeMap = await getActiveResumesForStudents(studentIds);

  const [techSkills, roleInterests, snapshots, githubProfiles, codingProfiles, evidenceSnapshots] =
    await Promise.all([
    prisma.studentTechSkill.findMany({
      where: { studentId: { in: studentIds } },
      include: { techSkill: { select: { name: true } } },
    }),
    prisma.studentRoleInterest.findMany({
      where: { studentId: { in: studentIds } },
    }),
    prisma.readinessSnapshot.findMany({
      where: { studentId: { in: studentIds } },
      orderBy: { calculatedAt: "desc" },
    }),
    prisma.gitHubProfile.findMany({
      where: { studentId: { in: studentIds } },
    }),
    prisma.studentCodingProfile.findMany({
      where: { studentId: { in: studentIds } },
      include: { platform: { select: { name: true } } },
      orderBy: { evidenceScore: "desc" },
    }),
    prisma.skillEvidenceSnapshot.findMany({
      where: { studentId: { in: studentIds } },
    }),
  ]);

  const techByStudent = new Map<string, typeof techSkills>();
  for (const skill of techSkills) {
    const list = techByStudent.get(skill.studentId) ?? [];
    list.push(skill);
    techByStudent.set(skill.studentId, list);
  }

  const interestsByStudent = new Map<string, typeof roleInterests>();
  for (const interest of roleInterests) {
    const list = interestsByStudent.get(interest.studentId) ?? [];
    list.push(interest);
    interestsByStudent.set(interest.studentId, list);
  }

  const latestSnapshot = new Map<string, (typeof snapshots)[0]>();
  for (const snap of snapshots) {
    if (!latestSnapshot.has(snap.studentId)) {
      latestSnapshot.set(snap.studentId, snap);
    }
  }

  const githubByStudent = new Map(
    githubProfiles.map((profile) => [profile.studentId, profile])
  );

  const codingByStudent = new Map<
    string,
    typeof codingProfiles
  >();
  for (const profile of codingProfiles) {
    const list = codingByStudent.get(profile.studentId) ?? [];
    list.push(profile);
    codingByStudent.set(profile.studentId, list);
  }

  const evidenceByStudent = new Map<string, typeof evidenceSnapshots>();
  for (const ev of evidenceSnapshots) {
    const list = evidenceByStudent.get(ev.studentId) ?? [];
    list.push(ev);
    evidenceByStudent.set(ev.studentId, list);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PlacementIQ";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Students", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = EXPORT_COLUMNS.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FF1E293B" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF8FAFC" },
  };
  headerRow.alignment = { vertical: "middle" };

  for (const student of students) {
    const resume = resumeMap.get(student.id);
    const skills = techByStudent.get(student.id) ?? [];
    const interests = interestsByStudent.get(student.id) ?? [];
    const verified = skills.filter((s) =>
      VERIFIED_STATUSES.includes(s.verificationStatus)
    );
    const topSkills = skills
      .slice(0, 5)
      .map((s) => s.techSkill.name)
      .join(", ");
    const primaryRole =
      interests.find((r) => r.interestLevel === "HIGH") ?? interests[0] ?? null;
    const snap = latestSnapshot.get(student.id);
    const github = githubByStudent.get(student.id);
    const codingList = codingByStudent.get(student.id) ?? [];
    const topCoding = codingList[0];
    const evidenceList = evidenceByStudent.get(student.id) ?? [];
    const strongEvidenceSkills = evidenceList
      .filter((e) => e.evidenceStrength === "STRONG" || e.evidenceStrength === "VERIFIED")
      .map((e) => e.skillName)
      .slice(0, 8)
      .join(", ");
    const weakEvidenceSkills = evidenceList
      .filter((e) => e.evidenceStrength === "WEAK")
      .map((e) => e.skillName)
      .slice(0, 8)
      .join(", ");
    const verifiedEvidenceCount = evidenceList.filter(
      (e) => e.evidenceStrength === "VERIFIED"
    ).length;
    const missingEvidenceActions = evidenceList
      .filter((e) => e.suggestedAction)
      .slice(0, 5)
      .map((e) => `${e.skillName}: ${e.suggestedAction}`)
      .join(" | ");
    let topGitHubLanguages = "—";
    if (github?.topLanguagesJson) {
      try {
        const langs = JSON.parse(github.topLanguagesJson) as { name: string }[];
        topGitHubLanguages = langs.map((l) => l.name).slice(0, 5).join(", ") || "—";
      } catch {
        topGitHubLanguages = "—";
      }
    }

    sheet.addRow({
      fullName: student.fullName,
      rollNumber: student.rollNumber,
      email: student.email,
      phone: student.phone ?? "",
      branch: student.branch,
      section: student.section ?? "",
      batch: student.batch,
      graduationYear: student.graduationYear,
      cgpa: student.cgpa ?? "",
      activeBacklogs: student.activeBacklogs,
      placementStatus:
        PLACEMENT_STATUS_LABELS[student.placementStatus as PlacementStatus],
      resumeStatus:
        RESUME_STATUS_LABELS[
          student.resumeStatus as keyof typeof RESUME_STATUS_LABELS
        ],
      resumeUploaded: resume ? "Yes" : "No",
      resumeReviewStatus: resume
        ? RESUME_REVIEW_STATUS_LABELS[
            resume.reviewStatus as ResumeReviewStatus
          ]
        : "Not Uploaded",
      resumeScore: resume ? resume.resumeScore : "",
      atsFriendly: resume ? (resume.atsFriendly ? "Yes" : "No") : "",
      resumeFileName: resume?.originalFileName ?? "",
      downloadAvailable: resume ? "Yes" : "No",
      technicalScore: student.technicalScore,
      communicationScore: student.communicationScore,
      linkedinUrl: student.linkedinUrl ?? "",
      githubUrl: student.githubUrl ?? "",
      githubSynced: github?.syncStatus === "SYNCED" ? "Yes" : "No",
      githubEvidenceScore:
        github?.syncStatus === "SYNCED" ? github.evidenceScore.toFixed(1) : "—",
      topGitHubLanguages,
      lastGitHubSync: github?.lastSyncedAt
        ? github.lastSyncedAt.toISOString().slice(0, 10)
        : "—",
      codingProfilesLinked: codingList.length || "0",
      topCodingPlatform: topCoding?.platform.name ?? "—",
      totalCodingProblemsSolved: codingList.reduce(
        (sum, p) => sum + p.totalProblemsSolved,
        0
      ),
      codingEvidenceScore:
        codingList.length > 0
          ? Math.max(...codingList.map((p) => p.evidenceScore)).toFixed(1)
          : "—",
      codingVerificationStatus: topCoding?.verificationStatus ?? "—",
      strongEvidenceSkills: strongEvidenceSkills || "—",
      weakEvidenceSkills: weakEvidenceSkills || "—",
      verifiedEvidenceCount: verifiedEvidenceCount || "0",
      missingEvidenceActions: missingEvidenceActions || "—",
      topTechSkills: topSkills || "—",
      verifiedSkillsCount: verified.length,
      primaryRoleInterest: primaryRole?.roleName ?? "—",
      roleReadinessLevel: primaryRole
        ? ROLE_READINESS_LABELS[primaryRole.readinessLevel]
        : "—",
      overallReadinessScore: snap ? snap.overallScore.toFixed(1) : "—",
      readinessStatus: snap
        ? READINESS_STATUS_LABELS[snap.readinessStatus as keyof typeof READINESS_STATUS_LABELS]
        : "—",
      riskLevel: snap
        ? RISK_LEVEL_LABELS[snap.riskLevel as keyof typeof RISK_LEVEL_LABELS]
        : "—",
      technicalReadiness: snap ? snap.technicalReadiness.toFixed(1) : "—",
      communicationReadiness: snap ? snap.communicationReadiness.toFixed(1) : "—",
      resumeReadiness: snap ? snap.resumeReadiness.toFixed(1) : "—",
      techStackReadiness: snap ? snap.techStackReadiness.toFixed(1) : "—",
      profileReadiness: snap ? snap.profileReadiness.toFixed(1) : "—",
      academicReadiness: snap ? snap.academicReadiness.toFixed(1) : "—",
      nextRecommendedAction: snap?.nextRecommendedAction ?? "—",
    });
  }

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: EXPORT_COLUMNS.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    meta: {
      totalRows,
      exportedRows: students.length,
      truncated: totalRows > students.length,
      limit,
    },
  };
}

export function getExportFilename(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `placementiq-students-${date}.xlsx`;
}

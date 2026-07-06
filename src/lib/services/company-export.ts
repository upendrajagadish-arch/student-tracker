import ExcelJS from "exceljs";
import { getAllMatchesForExport } from "@/lib/services/company-matching";

const EXPORT_COLUMNS = [
  { header: "Company", key: "companyName", width: 24 },
  { header: "Role", key: "roleTitle", width: 24 },
  { header: "Student Name", key: "studentName", width: 24 },
  { header: "Roll Number", key: "rollNumber", width: 16 },
  { header: "Branch", key: "branch", width: 20 },
  { header: "Batch", key: "batch", width: 14 },
  { header: "Email", key: "email", width: 28 },
  { header: "Phone", key: "phone", width: 16 },
  { header: "CGPA", key: "cgpa", width: 8 },
  { header: "Active Backlogs", key: "activeBacklogs", width: 16 },
  { header: "Match Score", key: "matchScore", width: 14 },
  { header: "Match Status", key: "matchStatus", width: 16 },
  { header: "Eligibility Status", key: "eligibilityStatus", width: 18 },
  { header: "Readiness Score", key: "readinessScore", width: 16 },
  { header: "Technical Score", key: "technicalScore", width: 16 },
  { header: "Communication Score", key: "communicationScore", width: 20 },
  { header: "Resume Score", key: "resumeScore", width: 14 },
  { header: "Matched Skills", key: "matchedSkills", width: 36 },
  { header: "Missing Skills", key: "missingSkills", width: 36 },
  { header: "Risks", key: "risks", width: 36 },
  { header: "Resume Review Status", key: "resumeReviewStatus", width: 20 },
  { header: "LinkedIn URL", key: "linkedinUrl", width: 32 },
  { header: "GitHub URL", key: "githubUrl", width: 32 },
] as const;

export async function exportRequirementMatchesToExcel(
  requirementId: string
): Promise<{ buffer: Buffer; meta: { total: number; exported: number; truncated: boolean; limit: number } }> {
  const { rows, total, truncated, limit } = await getAllMatchesForExport(requirementId);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PlacementIQ";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Matching Results", {
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
    fgColor: { argb: "FFF1F5F9" },
  };

  for (const match of rows) {
    sheet.addRow({
      companyName: match.companyName,
      roleTitle: match.roleTitle,
      studentName: match.studentName,
      rollNumber: match.rollNumber,
      branch: match.branch,
      batch: match.batch,
      email: match.email,
      phone: match.phone ?? "",
      cgpa: match.cgpa ?? "",
      activeBacklogs: match.activeBacklogs,
      matchScore: match.matchScore,
      matchStatus: match.matchStatus,
      eligibilityStatus: match.eligibilityStatus,
      readinessScore: match.readinessScore,
      technicalScore: match.technicalScore,
      communicationScore: match.communicationScore,
      resumeScore: match.resumeScore,
      matchedSkills: match.matchedSkills.join(", "),
      missingSkills: match.missingSkills.join(", "),
      risks: match.risks.join("; "),
      resumeReviewStatus: match.resumeReviewStatus ?? "",
      linkedinUrl: match.linkedinUrl ?? "",
      githubUrl: match.githubUrl ?? "",
    });
  }

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: EXPORT_COLUMNS.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    meta: { total, exported: rows.length, truncated, limit },
  };
}

export function getRequirementExportFilename(
  companyName: string,
  roleTitle: string
): string {
  const date = new Date().toISOString().slice(0, 10);
  const safeCompany = companyName.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 30);
  const safeRole = roleTitle.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 30);
  return `placementiq-matches-${safeCompany}-${safeRole}-${date}.xlsx`;
}

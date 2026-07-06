import ExcelJS from "exceljs";
import {
  FINAL_OUTCOME_LABELS,
  PLACEMENT_STAGE_LABELS,
  PIPELINE_STATUS_LABELS,
} from "@/lib/placement-constants";
import { prisma } from "@/lib/db";
import { getDriveExportRows } from "@/lib/services/placement-drives";
import { assertExportWithinLimit, getExportRowLimit } from "@/lib/export-limits";

export async function exportDrivePipelineToExcel(
  driveId: string
): Promise<{ buffer: Buffer; meta: { total: number; exported: number; truncated: boolean; limit: number } }> {
  const limit = getExportRowLimit();
  const total = await prisma.placementDrive.findUnique({
    where: { id: driveId },
    select: { _count: { select: { stages: true } } },
  });
  const totalRows = total?._count.stages ?? 0;
  assertExportWithinLimit(totalRows, limit);

  const rows = (await getDriveExportRows(driveId)).slice(0, limit);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Drive Pipeline");

  sheet.columns = [
    { header: "Drive Title", key: "driveTitle", width: 28 },
    { header: "Company", key: "company", width: 22 },
    { header: "Role", key: "role", width: 22 },
    { header: "Student Name", key: "studentName", width: 24 },
    { header: "Roll Number", key: "rollNumber", width: 14 },
    { header: "Branch", key: "branch", width: 10 },
    { header: "Batch", key: "batch", width: 10 },
    { header: "Email", key: "email", width: 28 },
    { header: "Phone", key: "phone", width: 14 },
    { header: "CGPA", key: "cgpa", width: 8 },
    { header: "Readiness Score", key: "readinessScore", width: 14 },
    { header: "Match Score", key: "matchScore", width: 12 },
    { header: "Current Stage", key: "currentStage", width: 18 },
    { header: "Final Outcome", key: "finalOutcome", width: 14 },
    { header: "Attendance", key: "attendanceStatus", width: 14 },
    { header: "Technical Round", key: "technicalRoundStatus", width: 16 },
    { header: "HR Round", key: "hrRoundStatus", width: 12 },
    { header: "Offer Status", key: "offerStatus", width: 12 },
    { header: "Joining Status", key: "joiningStatus", width: 14 },
    { header: "Package LPA", key: "packageLpa", width: 12 },
    { header: "Offer Location", key: "offerLocation", width: 18 },
    { header: "Rejection Reason", key: "rejectionReason", width: 24 },
    { header: "Notes", key: "notes", width: 30 },
  ];

  for (const row of rows) {
    sheet.addRow({
      ...row,
      currentStage:
        PLACEMENT_STAGE_LABELS[
          row.currentStage as keyof typeof PLACEMENT_STAGE_LABELS
        ] ?? row.currentStage,
      finalOutcome:
        FINAL_OUTCOME_LABELS[
          row.finalOutcome as keyof typeof FINAL_OUTCOME_LABELS
        ] ?? row.finalOutcome,
      attendanceStatus:
        PIPELINE_STATUS_LABELS[
          row.attendanceStatus as keyof typeof PIPELINE_STATUS_LABELS
        ] ?? row.attendanceStatus,
      technicalRoundStatus:
        PIPELINE_STATUS_LABELS[
          row.technicalRoundStatus as keyof typeof PIPELINE_STATUS_LABELS
        ] ?? row.technicalRoundStatus,
      hrRoundStatus:
        PIPELINE_STATUS_LABELS[
          row.hrRoundStatus as keyof typeof PIPELINE_STATUS_LABELS
        ] ?? row.hrRoundStatus,
      offerStatus:
        PIPELINE_STATUS_LABELS[
          row.offerStatus as keyof typeof PIPELINE_STATUS_LABELS
        ] ?? row.offerStatus,
      joiningStatus:
        PIPELINE_STATUS_LABELS[
          row.joiningStatus as keyof typeof PIPELINE_STATUS_LABELS
        ] ?? row.joiningStatus,
    });
  }

  sheet.getRow(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    meta: {
      total: totalRows,
      exported: rows.length,
      truncated: totalRows > rows.length,
      limit,
    },
  };
}

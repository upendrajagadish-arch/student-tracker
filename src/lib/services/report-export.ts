import ExcelJS from "exceljs";
import type { PublicBrandingSettings } from "@/types/branding";
import type { ReportResult } from "@/types/reports";

export interface ReportExportOptions {
  branding?: PublicBrandingSettings;
  filtersApplied?: string;
}

export async function exportReportToExcel(
  report: ReportResult,
  options: ReportExportOptions = {}
): Promise<Buffer> {
  const branding = options.branding;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = branding?.institutionName ?? "PlacementIQ";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Metric", key: "label", width: 32 },
    { header: "Value", key: "value", width: 36 },
  ];

  if (branding) {
    summarySheet.addRow({ label: "Institution", value: branding.institutionName });
    summarySheet.addRow({
      label: "Placement Cell",
      value: branding.placementCellName,
    });
    if (branding.defaultAcademicYear) {
      summarySheet.addRow({
        label: "Academic Year",
        value: branding.defaultAcademicYear,
      });
    }
    summarySheet.addRow({ label: "", value: "" });
  }

  summarySheet.addRow({ label: "Report", value: report.title });
  summarySheet.addRow({
    label: "Generated",
    value: new Date(report.generatedAt).toLocaleString(),
  });
  if (options.filtersApplied) {
    summarySheet.addRow({ label: "Filters", value: options.filtersApplied });
  }
  summarySheet.addRow({ label: "Description", value: report.description });
  summarySheet.addRow({ label: "", value: "" });
  for (const item of report.summary) {
    summarySheet.addRow({ label: item.label, value: item.value });
  }
  summarySheet.getRow(1).font = { bold: true };

  for (const section of report.sections) {
    const safeName = section.title.slice(0, 28).replace(/[\\/*?:[\]]/g, "");
    const sheet = workbook.addWorksheet(safeName || "Data");
    sheet.addRow(section.headers);
    for (const row of section.rows) {
      sheet.addRow(row);
    }
    sheet.getRow(1).font = { bold: true };
    section.headers.forEach((_, i) => {
      sheet.getColumn(i + 1).width = Math.min(
        36,
        Math.max(12, section.headers[i]?.length ?? 12)
      );
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function reportExportFilename(report: ReportResult): string {
  const slug = report.type.toLowerCase().replace(/_/g, "-");
  return `placementiq-${slug}-${Date.now()}.xlsx`;
}

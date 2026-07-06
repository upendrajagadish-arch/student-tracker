export class ExportLimitExceededError extends Error {
  readonly totalRows: number;
  readonly limit: number;

  constructor(totalRows: number, limit: number) {
    super(
      `Export includes ${totalRows.toLocaleString()} rows, which exceeds the limit of ${limit.toLocaleString()}. ` +
        `Apply branch, batch, or other filters to reduce the result set, or raise EXPORT_ROW_LIMIT.`
    );
    this.name = "ExportLimitExceededError";
    this.totalRows = totalRows;
    this.limit = limit;
  }
}

export function getExportRowLimit(): number {
  const raw = process.env.EXPORT_ROW_LIMIT;
  const parsed = raw ? Number.parseInt(raw, 10) : 5000;
  if (!Number.isFinite(parsed) || parsed < 1) return 5000;
  return Math.min(parsed, 50000);
}

export function getPrintReportRowLimit(): number {
  const raw = process.env.PRINT_REPORT_ROW_LIMIT;
  const parsed = raw ? Number.parseInt(raw, 10) : 200;
  if (!Number.isFinite(parsed) || parsed < 1) return 200;
  return Math.min(parsed, 2000);
}

export function getReportRowLimit(): number {
  const raw = process.env.REPORT_ROW_LIMIT;
  const parsed = raw ? Number.parseInt(raw, 10) : 500;
  if (!Number.isFinite(parsed) || parsed < 1) return 500;
  return Math.min(parsed, 5000);
}

export function getBulkStageUpdateLimit(): number {
  return 200;
}

export function getBulkReadinessBatchSize(): number {
  const raw = process.env.BULK_READINESS_BATCH_SIZE;
  const parsed = raw ? Number.parseInt(raw, 10) : 100;
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 500) : 100;
}

export function assertExportWithinLimit(totalRows: number, limit?: number): void {
  const cap = limit ?? getExportRowLimit();
  if (totalRows > cap) {
    throw new ExportLimitExceededError(totalRows, cap);
  }
}

export function capRows<T>(rows: T[], limit: number): { rows: T[]; truncated: boolean } {
  if (rows.length <= limit) {
    return { rows, truncated: false };
  }
  return { rows: rows.slice(0, limit), truncated: true };
}

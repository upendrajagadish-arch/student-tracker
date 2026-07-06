import { PLACEMENT_STATUS_LABELS } from "@/lib/constants";
import type { PlacementStatus } from "@/types";
import { z } from "zod";

const PLACEMENT_STATUS_MAP: Record<string, PlacementStatus> = {
  NOT_STARTED: "NOT_STARTED",
  "NOT STARTED": "NOT_STARTED",
  IN_TRAINING: "IN_TRAINING",
  "IN TRAINING": "IN_TRAINING",
  READY: "READY",
  SHORTLISTED: "SHORTLISTED",
  PLACED: "PLACED",
  NEEDS_ATTENTION: "NEEDS_ATTENTION",
  "NEEDS ATTENTION": "NEEDS_ATTENTION",
};

Object.entries(PLACEMENT_STATUS_LABELS).forEach(([key, label]) => {
  PLACEMENT_STATUS_MAP[label.toUpperCase()] = key as PlacementStatus;
  PLACEMENT_STATUS_MAP[label] = key as PlacementStatus;
});

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((val) => (val === "" ? undefined : val))
  .refine(
    (val) => !val || z.string().url().safeParse(val).success,
    "Must be a valid URL"
  );

export const importRowSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  rollNumber: z.string().trim().min(1, "Roll number is required"),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((val) => (val === "" ? undefined : val)),
  branch: z.string().trim().min(1, "Branch is required"),
  section: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((val) => (val === "" ? undefined : val)),
  batch: z.string().trim().min(1, "Batch is required"),
  graduationYear: z.coerce
    .number()
    .int("Graduation year must be a whole number")
    .min(2020, "Graduation year must be 2020 or later")
    .max(2035, "Graduation year must be 2035 or earlier"),
  cgpa: z.coerce
    .number()
    .min(0, "CGPA must be at least 0")
    .max(10, "CGPA cannot exceed 10")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  activeBacklogs: z.coerce
    .number()
    .int("Backlogs must be a whole number")
    .min(0, "Active backlogs cannot be negative")
    .optional()
    .default(0),
  placementStatus: z
    .string()
    .optional()
    .transform((val) => normalizePlacementStatus(val))
    .pipe(
      z.enum([
        "NOT_STARTED",
        "IN_TRAINING",
        "READY",
        "SHORTLISTED",
        "PLACED",
        "NEEDS_ATTENTION",
      ])
    )
    .optional()
    .default("NOT_STARTED"),
  linkedinUrl: optionalUrl,
  githubUrl: optionalUrl,
});

import type { ImportRow, ImportRowStatus } from "@/types/import";

export interface ParsedImportRow {
  rowNumber: number;
  raw: Record<string, string>;
  data?: ImportRow;
  errors: string[];
  status: ImportRowStatus;
  duplicateReason?: string;
}

export type { ImportRow, ImportRowStatus };

const IGNORED_IMPORT_HEADERS = new Set([
  "readinessscore",
  "readiness score",
  "placementreadiness",
  "placement readiness",
  "placementreadinessscore",
  "placement readiness score",
  "overallreadinessscore",
  "overall readiness score",
]);

const COLUMN_ALIASES: Record<string, string> = {
  fullname: "fullName",
  name: "fullName",
  "full name": "fullName",
  rollnumber: "rollNumber",
  "roll number": "rollNumber",
  rollno: "rollNumber",
  "roll no": "rollNumber",
  email: "email",
  phone: "phone",
  mobile: "phone",
  branch: "branch",
  section: "section",
  batch: "batch",
  graduationyear: "graduationYear",
  "graduation year": "graduationYear",
  gradyear: "graduationYear",
  cgpa: "cgpa",
  activebacklogs: "activeBacklogs",
  "active backlogs": "activeBacklogs",
  backlogs: "activeBacklogs",
  placementstatus: "placementStatus",
  "placement status": "placementStatus",
  status: "placementStatus",
  linkedinurl: "linkedinUrl",
  "linkedin url": "linkedinUrl",
  linkedin: "linkedinUrl",
  githuburl: "githubUrl",
  "github url": "githubUrl",
  github: "githubUrl",
};

export const IMPORT_COLUMNS = [
  "fullName",
  "rollNumber",
  "email",
  "phone",
  "branch",
  "section",
  "batch",
  "graduationYear",
  "cgpa",
  "activeBacklogs",
  "placementStatus",
  "linkedinUrl",
  "githubUrl",
] as const;

function normalizePlacementStatus(value?: string): PlacementStatus {
  if (!value || value.trim() === "") return "NOT_STARTED";
  const key = value.trim().toUpperCase();
  return PLACEMENT_STATUS_MAP[value.trim()] ?? PLACEMENT_STATUS_MAP[key] ?? "NOT_STARTED";
}

function normalizeHeader(header: string): string | null {
  const normalized = header.trim().toLowerCase().replace(/[_-]/g, " ");
  const compact = normalized.replace(/\s+/g, "");
  if (
    IGNORED_IMPORT_HEADERS.has(compact) ||
    IGNORED_IMPORT_HEADERS.has(normalized)
  ) {
    return null;
  }
  return COLUMN_ALIASES[compact] ?? COLUMN_ALIASES[normalized] ?? null;
}

export function parseCsvContent(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map((h) => normalizeHeader(h));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.every((v) => v.trim() === "")) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      if (header) {
        row[header] = values[idx]?.trim() ?? "";
      }
    });
    rows.push(row);
  }

  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export async function parseExcelBuffer(
  buffer: Buffer
): Promise<Record<string, string>[]> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await (
    workbook.xlsx.load as unknown as (data: Buffer) => Promise<void>
  )(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const headerRow = worksheet.getRow(1);
  const headers: (string | null)[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const value = cell.value?.toString() ?? "";
    headers[colNumber] = normalizeHeader(value);
  });

  const rows: Record<string, string>[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const record: Record<string, string> = {};
    let hasData = false;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;
      const value =
        cell.value === null || cell.value === undefined
          ? ""
          : String(cell.value).trim();
      if (value) hasData = true;
      record[header] = value;
    });

    if (hasData) rows.push(record);
  });

  return rows;
}

export async function parseImportFile(
  buffer: Buffer,
  filename: string
): Promise<Record<string, string>[]> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv")) {
    return parseCsvContent(buffer.toString("utf-8"));
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return parseExcelBuffer(buffer);
  }
  throw new Error("Unsupported file type. Upload a .csv or .xlsx file.");
}

export async function validateImportRows(
  rawRows: Record<string, string>[],
  options: { updateMode?: boolean } = {}
): Promise<ParsedImportRow[]> {
  const { prisma } = await import("@/lib/db");

  const rollNumbersInFile = new Map<string, number>();
  const emailsInFile = new Map<string, number>();

  const allRollNumbers = rawRows
    .map((r) => r.rollNumber?.trim())
    .filter(Boolean) as string[];
  const allEmails = rawRows
    .map((r) => r.email?.trim().toLowerCase())
    .filter(Boolean) as string[];

  const [existingByRoll, existingByEmail] = await Promise.all([
    prisma.student.findMany({
      where: { rollNumber: { in: allRollNumbers } },
      select: { rollNumber: true, email: true, id: true },
    }),
    prisma.student.findMany({
      where: { email: { in: allEmails } },
      select: { rollNumber: true, email: true, id: true },
    }),
  ]);

  const rollSet = new Map(existingByRoll.map((s) => [s.rollNumber, s]));
  const emailSet = new Map(existingByEmail.map((s) => [s.email.toLowerCase(), s]));

  return rawRows.map((raw, index) => {
    const rowNumber = index + 2;
    const errors: string[] = [];

    const parsed = importRowSchema.safeParse(raw);
    if (!parsed.success) {
      parsed.error.errors.forEach((e) => {
        errors.push(e.message);
      });
      return {
        rowNumber,
        raw,
        errors,
        status: "invalid" as const,
      };
    }

    const data = parsed.data;
    const rollKey = data.rollNumber;
    const emailKey = data.email.toLowerCase();

    if (rollNumbersInFile.has(rollKey)) {
      errors.push(
        `Duplicate roll number in file (also on row ${rollNumbersInFile.get(rollKey)})`
      );
    } else {
      rollNumbersInFile.set(rollKey, rowNumber);
    }

    if (emailsInFile.has(emailKey)) {
      errors.push(
        `Duplicate email in file (also on row ${emailsInFile.get(emailKey)})`
      );
    } else {
      emailsInFile.set(emailKey, rowNumber);
    }

    const existingRoll = rollSet.get(rollKey);
    const existingEmail = emailSet.get(emailKey);

    if (existingRoll) {
      if (options.updateMode) {
        if (errors.length > 0) {
          return { rowNumber, raw, data, errors, status: "invalid" as const };
        }
        if (
          existingEmail &&
          existingEmail.rollNumber !== rollKey &&
          existingEmail.email.toLowerCase() === emailKey
        ) {
          return {
            rowNumber,
            raw,
            data,
            errors: ["Email belongs to a different existing student"],
            status: "invalid" as const,
          };
        }
        return {
          rowNumber,
          raw,
          data,
          errors: [],
          status: "update" as const,
          duplicateReason: "Will update existing student by roll number",
        };
      }
      return {
        rowNumber,
        raw,
        data,
        errors: ["Roll number already exists in database"],
        status: "duplicate" as const,
        duplicateReason: "Existing student with this roll number",
      };
    }

    if (existingEmail && existingEmail.rollNumber !== rollKey) {
      errors.push("Email already exists for another student");
      return {
        rowNumber,
        raw,
        data,
        errors,
        status: "duplicate" as const,
        duplicateReason: "Email already registered",
      };
    }

    if (errors.length > 0) {
      return { rowNumber, raw, data, errors, status: "invalid" as const };
    }

    return { rowNumber, raw, data, errors: [], status: "valid" as const };
  });
}

export async function executeImport(
  rows: ParsedImportRow[],
  options: { updateMode?: boolean } = {}
): Promise<{
  created: number;
  updated: number;
  skipped: number;
  studentIds: string[];
}> {
  const { prisma } = await import("@/lib/db");

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const studentIds: string[] = [];

  const importable = rows.filter(
    (r) => r.status === "valid" || (options.updateMode && r.status === "update")
  );

  for (const row of importable) {
    if (!row.data) {
      skipped++;
      continue;
    }

    const payload = {
      fullName: row.data.fullName,
      rollNumber: row.data.rollNumber,
      email: row.data.email.toLowerCase(),
      phone: row.data.phone ?? null,
      branch: row.data.branch,
      section: row.data.section ?? null,
      batch: row.data.batch,
      graduationYear: row.data.graduationYear,
      cgpa: row.data.cgpa ?? null,
      activeBacklogs: row.data.activeBacklogs ?? 0,
      placementStatus: row.data.placementStatus ?? "NOT_STARTED",
      linkedinUrl: row.data.linkedinUrl ?? null,
      githubUrl: row.data.githubUrl ?? null,
    };

    if (row.status === "update" && options.updateMode) {
      const student = await prisma.student.update({
        where: { rollNumber: row.data.rollNumber },
        data: payload,
      });
      studentIds.push(student.id);
      updated++;
    } else {
      const student = await prisma.student.create({ data: payload });
      studentIds.push(student.id);
      created++;
    }
  }

  skipped += rows.length - importable.length;

  return { created, updated, skipped, studentIds };
}

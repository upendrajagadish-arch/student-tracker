import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/services/audit";
import {
  buildProfileData,
  ensureCodingPlatformsSeeded,
  normalizePlatformSlug,
} from "@/lib/services/coding-platforms";
import { parseImportFile } from "@/lib/services/import";
import { triggerReadinessRecalculation } from "@/lib/services/readiness";
import type {
  CodingProfileImportRow,
  ParsedCodingImportRow,
} from "@/types/coding-platforms";
import type { UserRole } from "@/types";
import { z } from "zod";

const COLUMN_ALIASES: Record<string, string> = {
  rollnumber: "rollNumber",
  "roll number": "rollNumber",
  roll: "rollNumber",
  email: "email",
  "email id": "email",
  platform: "platform",
  "platform name": "platform",
  username: "username",
  "user name": "username",
  handle: "username",
  profileurl: "profileUrl",
  "profile url": "profileUrl",
  url: "profileUrl",
  totalproblemssolved: "totalProblemsSolved",
  "total problems solved": "totalProblemsSolved",
  problems: "totalProblemsSolved",
  solved: "totalProblemsSolved",
  easysolved: "easySolved",
  "easy solved": "easySolved",
  easy: "easySolved",
  mediumsolved: "mediumSolved",
  "medium solved": "mediumSolved",
  medium: "mediumSolved",
  hardsolved: "hardSolved",
  "hard solved": "hardSolved",
  hard: "hardSolved",
  contestrating: "contestRating",
  "contest rating": "contestRating",
  rating: "contestRating",
  globalrank: "globalRank",
  "global rank": "globalRank",
  rank: "globalRank",
  lastactivityat: "lastActivityAt",
  "last activity": "lastActivityAt",
  "last activity at": "lastActivityAt",
  badges: "badges",
  languages: "languages",
  language: "languages",
};

function normalizeHeader(header: string): string {
  const key = header.trim().toLowerCase().replace(/[_-]/g, " ");
  return COLUMN_ALIASES[key.replace(/\s+/g, "")] ?? COLUMN_ALIASES[key] ?? header;
}

function normalizeRow(raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    out[normalizeHeader(key)] = value?.trim() ?? "";
  }
  return out;
}

const optionalInt = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : undefined;
  });

const importRowSchema = z.object({
  rollNumber: z.string().optional(),
  email: z.string().optional(),
  platform: z.string().min(1, "Platform is required"),
  username: z.string().optional(),
  profileUrl: z.string().optional(),
  totalProblemsSolved: optionalInt,
  easySolved: optionalInt,
  mediumSolved: optionalInt,
  hardSolved: optionalInt,
  contestRating: optionalInt,
  globalRank: optionalInt,
  lastActivityAt: z.string().optional(),
  badges: z.string().optional(),
  languages: z.string().optional(),
});

export async function parseCodingPlatformImportFile(
  buffer: Buffer,
  fileName: string
): Promise<Record<string, string>[]> {
  const rows = await parseImportFile(buffer, fileName);
  return rows.map(normalizeRow);
}

export async function validateCodingImportRows(
  rawRows: Record<string, string>[],
  options: { updateMode?: boolean } = {}
): Promise<ParsedCodingImportRow[]> {
  await ensureCodingPlatformsSeeded();

  const platforms = await prisma.codingPlatform.findMany();
  const platformBySlug = new Map(platforms.map((p) => [p.slug, p]));

  const students = await prisma.student.findMany({
    select: { id: true, rollNumber: true, email: true },
  });
  const byRoll = new Map(
    students.map((s) => [s.rollNumber.toLowerCase(), s])
  );
  const byEmail = new Map(students.map((s) => [s.email.toLowerCase(), s]));

  const existingProfiles = await prisma.studentCodingProfile.findMany({
    select: { id: true, studentId: true, platformId: true },
  });
  const profileKey = new Map(
    existingProfiles.map((p) => [`${p.studentId}:${p.platformId}`, p.id])
  );

  return rawRows.map((raw, index) => {
    const rowNumber = index + 2;
    const parsed = importRowSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        rowNumber,
        raw,
        errors: parsed.error.errors.map((e) => e.message),
        status: "invalid" as const,
      };
    }

    const data = parsed.data as CodingProfileImportRow;
    const errors: string[] = [];

    if (!data.rollNumber?.trim() && !data.email?.trim()) {
      errors.push("Roll number or email is required");
    }

    const slug = normalizePlatformSlug(data.platform);
    const platform = platformBySlug.get(slug);
    if (!platform?.id) {
      return {
        rowNumber,
        raw,
        data,
        errors: [`Unknown platform: ${data.platform}`],
        status: "unknown_platform" as const,
      };
    }

    const student =
      (data.rollNumber
        ? byRoll.get(data.rollNumber.trim().toLowerCase())
        : undefined) ??
      (data.email ? byEmail.get(data.email.trim().toLowerCase()) : undefined);

    if (!student) {
      return {
        rowNumber,
        raw,
        data,
        errors: ["Student not found in PlacementIQ"],
        status: "unknown_student" as const,
        platformId: platform.id,
      };
    }

    const existingProfileId = profileKey.get(`${student.id}:${platform.id}`);

    if (errors.length > 0) {
      return { rowNumber, raw, data, errors, status: "invalid" as const };
    }

    if (existingProfileId) {
      if (!options.updateMode) {
        return {
          rowNumber,
          raw,
          data,
          errors: ["Profile already exists for this student and platform"],
          status: "invalid" as const,
          studentId: student.id,
          platformId: platform.id,
          existingProfileId,
        };
      }
      return {
        rowNumber,
        raw,
        data,
        errors: [],
        status: "update" as const,
        studentId: student.id,
        platformId: platform.id,
        existingProfileId,
      };
    }

    return {
      rowNumber,
      raw,
      data,
      errors: [],
      status: "valid" as const,
      studentId: student.id,
      platformId: platform.id,
    };
  });
}

export async function executeCodingImport(
  rows: ParsedCodingImportRow[],
  options: {
    updateMode?: boolean;
    actorUserId: string;
    actorRole: UserRole;
  }
): Promise<{
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  studentIds: string[];
}> {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const studentIds = new Set<string>();

  const importable = rows.filter(
    (r) =>
      r.status === "valid" || (options.updateMode && r.status === "update")
  );

  for (const row of importable) {
    if (!row.studentId || !row.platformId || !row.data) {
      failed += 1;
      continue;
    }

    try {
      const platform = await prisma.codingPlatform.findUniqueOrThrow({
        where: { id: row.platformId },
      });

      const badges = row.data.badges
        ? row.data.badges.split(/[,;|]/).map((s) => s.trim()).filter(Boolean)
        : [];
      const languages = row.data.languages
        ? row.data.languages.split(/[,;|]/).map((s) => s.trim()).filter(Boolean)
        : [];

      const input = {
        platformId: row.platformId,
        username: row.data.username ?? null,
        profileUrl: row.data.profileUrl ?? null,
        totalProblemsSolved: row.data.totalProblemsSolved ?? 0,
        easySolved: row.data.easySolved ?? null,
        mediumSolved: row.data.mediumSolved ?? null,
        hardSolved: row.data.hardSolved ?? null,
        contestRating: row.data.contestRating ?? null,
        globalRank: row.data.globalRank ?? null,
        badges,
        primaryLanguages: languages,
        lastActivityAt: row.data.lastActivityAt ?? null,
        verificationStatus: "CSV_VERIFIED" as const,
        dataSource: "CSV_IMPORT" as const,
      };

      if (row.status === "update" && row.existingProfileId) {
        const existing = await prisma.studentCodingProfile.findUnique({
          where: { id: row.existingProfileId },
        });
        const data = buildProfileData(input, platform, existing);
        await prisma.studentCodingProfile.update({
          where: { id: row.existingProfileId },
          data: {
            ...data,
            lastUpdatedByUserId: options.actorUserId,
          },
        });
        updated += 1;
      } else {
        const data = buildProfileData(input, platform);
        await prisma.studentCodingProfile.create({
          data: {
            studentId: row.studentId,
            platformId: row.platformId,
            ...data,
            lastUpdatedByUserId: options.actorUserId,
          },
        });
        created += 1;
      }

      studentIds.add(row.studentId);
    } catch {
      failed += 1;
    }
  }

  skipped = rows.length - importable.length - failed;

  await logAudit({
    actorUserId: options.actorUserId,
    actorRole: options.actorRole,
    action: "CODING_PLATFORM_CSV_IMPORTED",
    entityType: "StudentCodingProfile",
    description: `Coding platform CSV import: ${created} created, ${updated} updated, ${failed} failed`,
  });

  for (const studentId of studentIds) {
    await triggerReadinessRecalculation(studentId);
  }

  return {
    created,
    updated,
    skipped,
    failed,
    studentIds: [...studentIds],
  };
}

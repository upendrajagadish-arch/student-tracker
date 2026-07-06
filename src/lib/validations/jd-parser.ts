import { z } from "zod";

export const jdParseDraftSchema = z.object({
  companyName: z.string().nullable().optional().default(null),
  roleTitle: z.string().nullable().optional().default(null),
  jobType: z.string().nullable().optional().default(null),
  eligibleBranches: z.array(z.string()).default([]),
  eligibleBatches: z.array(z.string()).default([]),
  graduationYear: z.coerce.number().int().nullable().optional().default(null),
  minCgpa: z.coerce.number().min(0).max(10).nullable().optional().default(null),
  allowActiveBacklogs: z.boolean().default(false),
  maxActiveBacklogs: z.coerce.number().int().min(0).default(0),
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  requiredRoleInterests: z.array(z.string()).default([]),
  minTechnicalScore: z.coerce.number().min(0).max(100).default(0),
  minCommunicationScore: z.coerce.number().min(0).max(100).default(0),
  minResumeScore: z.coerce.number().min(0).max(100).default(0),
  minReadinessScore: z.coerce.number().min(0).max(100).default(0),
  requireResumeApproved: z.boolean().default(false),
  requireAtsFriendly: z.boolean().default(false),
  requireLinkedIn: z.boolean().default(false),
  requireGitHub: z.boolean().default(false),
  notes: z.string().nullable().optional().default(null),
});

export const jdParseResultSchema = z.object({
  draft: jdParseDraftSchema,
  confidenceScore: z.number().min(0).max(1),
  warnings: z.array(z.string()).default([]),
  missingInfo: z.array(z.string()).default([]),
  provider: z.enum(["openai", "rules"]),
  aiEnabled: z.boolean(),
});

export const parseJdRequestSchema = z.object({
  jdText: z.string().trim().min(40, "Paste a job description with at least 40 characters."),
  companyId: z.string().optional(),
  companyName: z.string().trim().optional(),
  roleHint: z.string().trim().optional(),
});

export type JdParseDraftInput = z.infer<typeof jdParseDraftSchema>;

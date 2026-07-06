import { z } from "zod";

export const companySchema = z.object({
  name: z.string().trim().min(1, "Company name is required"),
  website: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v))
    .refine(
      (v) => !v || z.string().url().safeParse(v).success,
      "Must be a valid URL"
    ),
  industry: z.string().trim().optional().or(z.literal("")),
  location: z.string().trim().optional().or(z.literal("")),
  contactPerson: z.string().trim().optional().or(z.literal("")),
  contactEmail: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || z.string().email().safeParse(v).success,
      "Must be a valid email"
    ),
  contactPhone: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
  isActive: z.boolean().optional().default(true),
});

export const companyRequirementSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  roleTitle: z.string().trim().min(1, "Role title is required"),
  jobType: z.string().trim().optional().or(z.literal("")),
  eligibleBranches: z.array(z.string()).optional().default([]),
  eligibleBatches: z.array(z.string()).optional().default([]),
  graduationYear: z.coerce.number().int().optional().nullable(),
  minCgpa: z.coerce.number().min(0).max(10).optional().nullable(),
  allowActiveBacklogs: z.boolean().optional().default(false),
  maxActiveBacklogs: z.coerce.number().int().min(0).optional().default(0),
  requiredSkills: z.array(z.string()).optional().default([]),
  preferredSkills: z.array(z.string()).optional().default([]),
  requiredRoleInterests: z.array(z.string()).optional().default([]),
  minTechnicalScore: z.coerce.number().min(0).max(100).optional().default(0),
  minCommunicationScore: z.coerce.number().min(0).max(100).optional().default(0),
  minResumeScore: z.coerce.number().min(0).max(100).optional().default(0),
  minReadinessScore: z.coerce.number().min(0).max(100).optional().default(0),
  requireResumeApproved: z.boolean().optional().default(false),
  requireAtsFriendly: z.boolean().optional().default(false),
  requireLinkedIn: z.boolean().optional().default(false),
  requireGitHub: z.boolean().optional().default(false),
  notes: z.string().trim().optional().or(z.literal("")),
  status: z
    .enum(["DRAFT", "ACTIVE", "CLOSED", "ARCHIVED"])
    .optional()
    .default("DRAFT"),
});

export type CompanyInput = z.infer<typeof companySchema>;
export type CompanyRequirementInput = z.infer<typeof companyRequirementSchema>;

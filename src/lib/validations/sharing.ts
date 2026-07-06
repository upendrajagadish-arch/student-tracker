import { z } from "zod";

export const assignHrAccessSchema = z.object({
  userId: z.string().min(1, "HR user is required"),
  accessRole: z.enum(["HR_VIEWER", "HR_RECRUITER", "HR_MANAGER"]).default("HR_VIEWER"),
});

export const createHrUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const shareStudentsSchema = z.object({
  companyId: z.string().min(1),
  companyRequirementId: z.string().min(1),
  studentIds: z.array(z.string()).min(1, "Select at least one student"),
  sharedWithUserId: z.string().optional().nullable(),
  allowResumeDownload: z.boolean().default(false),
  allowPlacementPassport: z.boolean().default(false),
  expiresAt: z.string().optional().nullable(),
  sharingNote: z.string().optional().nullable(),
});

export const bulkShareSchema = z.object({
  companyId: z.string().min(1),
  companyRequirementId: z.string().min(1),
  matchFilter: z.enum(["STRONG_FIT", "GOOD_AND_STRONG"]),
  sharedWithUserId: z.string().optional().nullable(),
  allowResumeDownload: z.boolean().default(false),
  allowPlacementPassport: z.boolean().default(false),
  expiresAt: z.string().optional().nullable(),
  sharingNote: z.string().optional().nullable(),
});

export const revokeSharesSchema = z.object({
  shareIds: z.array(z.string()).min(1),
});

export const updateShareSchema = z.object({
  allowResumeDownload: z.boolean().optional(),
  allowPlacementPassport: z.boolean().optional(),
  expiresAt: z.string().optional().nullable(),
});

export const hrDecisionSchema = z.object({
  hrDecision: z.enum([
    "PENDING",
    "INTERESTED",
    "NOT_INTERESTED",
    "SHORTLISTED",
    "NEEDS_MORE_INFO",
  ]),
  hrComments: z.string().optional().nullable(),
});

export type AssignHrAccessInput = z.infer<typeof assignHrAccessSchema>;
export type CreateHrUserInput = z.infer<typeof createHrUserSchema>;
export type ShareStudentsInput = z.infer<typeof shareStudentsSchema>;
export type BulkShareInput = z.infer<typeof bulkShareSchema>;
export type HrDecisionInput = z.infer<typeof hrDecisionSchema>;

import { z } from "zod";

export const placementDriveSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  companyRequirementId: z.string().optional().nullable(),
  driveTitle: z.string().min(2, "Drive title is required").max(200),
  driveDate: z.string().optional().nullable(),
  venue: z.string().max(200).optional().nullable(),
  mode: z.enum(["ONLINE", "OFFLINE", "HYBRID"]).default("OFFLINE"),
  status: z
    .enum(["DRAFT", "UPCOMING", "ONGOING", "COMPLETED", "CANCELLED", "ARCHIVED"])
    .default("DRAFT"),
  notes: z.string().max(2000).optional().nullable(),
});

export const stageActionSchema = z.object({
  action: z.enum([
    "MARK_REGISTERED",
    "MARK_ELIGIBLE",
    "MARK_ATTENDED",
    "MARK_NO_SHOW",
    "MARK_SHORTLISTED",
    "MARK_TECHNICAL_CLEARED",
    "MARK_TECHNICAL_FAILED",
    "MARK_HR_CLEARED",
    "MARK_HR_FAILED",
    "MARK_SELECTED",
    "MARK_OFFERED",
    "MARK_JOINED",
    "MARK_REJECTED",
    "MARK_WITHDRAWN",
  ]),
  rejectionReason: z.string().max(500).optional(),
  packageLpa: z.coerce.number().positive().optional(),
  offerLocation: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export const bulkStageActionSchema = z.object({
  stageIds: z.array(z.string()).min(1),
  action: stageActionSchema.shape.action,
  rejectionReason: z.string().max(500).optional(),
  packageLpa: z.coerce.number().positive().optional(),
  offerLocation: z.string().max(200).optional(),
});

export const addStudentsSchema = z.object({
  studentIds: z.array(z.string()).min(1),
});

export const addFromMatchSchema = z.object({
  requirementId: z.string(),
  matchFilter: z.enum(["STRONG_FIT", "GOOD_AND_STRONG", "SELECTED"]).optional(),
  studentIds: z.array(z.string()).optional(),
});

export const createFromRequirementSchema = z.object({
  requirementId: z.string(),
  driveTitle: z.string().optional(),
  driveDate: z.string().optional().nullable(),
});

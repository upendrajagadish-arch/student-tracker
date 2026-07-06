import { z } from "zod";

export const resumeReviewSchema = z.object({
  reviewStatus: z.enum([
    "UPLOADED",
    "UNDER_REVIEW",
    "REVIEWED",
    "NEEDS_IMPROVEMENT",
    "APPROVED",
  ]),
  atsFriendly: z.boolean().optional().default(false),
  resumeScore: z.coerce
    .number()
    .min(0, "Score must be at least 0")
    .max(100, "Score cannot exceed 100")
    .optional()
    .default(0),
  hasLinkedIn: z.boolean().optional().default(false),
  hasGitHub: z.boolean().optional().default(false),
  hasProjects: z.boolean().optional().default(false),
  hasCertifications: z.boolean().optional().default(false),
  reviewerComments: z
    .string()
    .max(2000, "Comments must be 2000 characters or less")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
});

export type ResumeReviewInput = z.infer<typeof resumeReviewSchema>;

export function validateResumeFile(
  file: File | { type: string; size: number; name: string },
  maxBytes = 5 * 1024 * 1024
): { valid: true } | { valid: false; error: string } {
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  const allowedExt = [".pdf", ".docx"];
  const lowerName = file.name.toLowerCase();
  const ext = lowerName.slice(lowerName.lastIndexOf("."));

  if (!allowedExt.includes(ext)) {
    return { valid: false, error: "Only PDF and DOCX files are allowed." };
  }

  if (
    file.type &&
    file.type !== "application/octet-stream" &&
    !allowedTypes.includes(file.type)
  ) {
    return { valid: false, error: "Only PDF and DOCX files are allowed." };
  }

  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    return { valid: false, error: `File size must not exceed ${mb} MB.` };
  }

  if (file.size === 0) {
    return { valid: false, error: "File is empty." };
  }

  return { valid: true };
}

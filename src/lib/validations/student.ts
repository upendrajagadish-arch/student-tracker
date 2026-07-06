import { z } from "zod";

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

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const studentSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  rollNumber: z.string().trim().min(1, "Roll number is required"),
  email: z.string().email("Enter a valid email address"),
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
    .enum([
      "NOT_STARTED",
      "IN_TRAINING",
      "READY",
      "SHORTLISTED",
      "PLACED",
      "NEEDS_ATTENTION",
    ])
    .optional()
    .default("NOT_STARTED"),
  linkedinUrl: optionalUrl,
  githubUrl: optionalUrl,
  resumeStatus: z
    .enum(["NOT_UPLOADED", "UPLOADED", "REVIEWED", "APPROVED"])
    .optional()
    .default("NOT_UPLOADED"),
  technicalScore: z.coerce
    .number()
    .min(0, "Score must be at least 0")
    .max(100, "Score cannot exceed 100")
    .optional()
    .default(0),
  communicationScore: z.coerce
    .number()
    .min(0, "Score must be at least 0")
    .max(100, "Score cannot exceed 100")
    .optional()
    .default(0),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type StudentInput = z.infer<typeof studentSchema>;

export const scoreUpdateSchema = z.object({
  technicalScore: z.coerce
    .number()
    .min(0, "Score must be at least 0")
    .max(100, "Score cannot exceed 100"),
  communicationScore: z.coerce
    .number()
    .min(0, "Score must be at least 0")
    .max(100, "Score cannot exceed 100"),
});

export type ScoreUpdateInput = z.infer<typeof scoreUpdateSchema>;

import { z } from "zod";

export const techSkillMasterSchema = z.object({
  name: z.string().trim().min(1, "Skill name is required").max(100),
  category: z.enum([
    "PROGRAMMING_LANGUAGE",
    "WEB_TECHNOLOGY",
    "DATABASE",
    "FRAMEWORK",
    "TOOL",
    "CLOUD",
    "DATA_ANALYTICS",
    "AI_ML",
    "CYBERSECURITY",
    "SOFT_SKILL",
    "OTHER",
  ]),
  isActive: z.boolean().optional().default(true),
});

export const studentTechSkillSchema = z.object({
  techSkillId: z.string().min(1, "Skill is required"),
  proficiencyLevel: z
    .enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"])
    .optional()
    .default("BEGINNER"),
  verificationStatus: z
    .enum([
      "SELF_DECLARED",
      "FACULTY_VERIFIED",
      "PERFORMANCE_VERIFIED",
      "RESUME_EVIDENCE",
      "GITHUB_EVIDENCE",
      "NOT_VERIFIED",
    ])
    .optional()
    .default("NOT_VERIFIED"),
  evidenceSource: z
    .string()
    .max(200)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  notes: z
    .string()
    .max(1000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
});

export const studentTechSkillUpdateSchema = studentTechSkillSchema
  .partial()
  .extend({
    techSkillId: z.string().optional(),
  });

export const roleInterestSchema = z.object({
  roleName: z.string().trim().min(1, "Role name is required").max(100),
  interestLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().default("MEDIUM"),
  readinessLevel: z
    .enum(["NOT_READY", "LEARNING", "NEAR_READY", "READY"])
    .optional()
    .default("NOT_READY"),
  notes: z
    .string()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
});

export type TechSkillMasterInput = z.infer<typeof techSkillMasterSchema>;
export type StudentTechSkillInput = z.infer<typeof studentTechSkillSchema>;
export type RoleInterestInput = z.infer<typeof roleInterestSchema>;

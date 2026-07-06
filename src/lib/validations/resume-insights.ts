import { z } from "zod";

export const roleSuitabilityItemSchema = z.object({
  role: z.string(),
  fit: z.enum(["strong", "moderate", "weak"]),
  reason: z.string(),
});

export const resumeInsightAnalysisSchema = z.object({
  detectedSkills: z.array(z.string()).default([]),
  possibleMissingSkills: z.array(z.string()).default([]),
  missingSections: z.array(z.string()).default([]),
  atsIssues: z.array(z.string()).default([]),
  improvementSuggestions: z.array(z.string()).default([]),
  roleSuitability: z.array(roleSuitabilityItemSchema).default([]),
  linkedInDetected: z.boolean().default(false),
  githubDetected: z.boolean().default(false),
  projectsDetected: z.boolean().default(false),
  certificationsDetected: z.boolean().default(false),
  atsFriendlyEstimate: z.boolean().default(false),
  suggestedResumeScore: z.coerce.number().min(0).max(100).nullable().default(null),
  confidenceScore: z.number().min(0).max(1),
  resumeTruthWarnings: z.array(z.string()).default([]),
  summary: z.string().default(""),
  provider: z.enum(["openai", "rules"]),
  aiEnabled: z.boolean(),
});

export const markInsightReviewedSchema = z.object({
  reviewStatus: z.enum(["REVIEWED", "DISMISSED"]).optional(),
});

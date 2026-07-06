import type {
  InterestLevel,
  ProficiencyLevel,
  RoleReadinessLevel,
  SkillCategory,
  VerificationStatus,
} from "@/types/tech-stack";

export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  PROGRAMMING_LANGUAGE: "Programming Language",
  WEB_TECHNOLOGY: "Web Technology",
  DATABASE: "Database",
  FRAMEWORK: "Framework",
  TOOL: "Tool",
  CLOUD: "Cloud",
  DATA_ANALYTICS: "Data & Analytics",
  AI_ML: "AI / ML",
  CYBERSECURITY: "Cybersecurity",
  SOFT_SKILL: "Soft Skill",
  OTHER: "Other",
};

export const PROFICIENCY_LABELS: Record<ProficiencyLevel, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  SELF_DECLARED: "Self Declared",
  FACULTY_VERIFIED: "Faculty Verified",
  PERFORMANCE_VERIFIED: "Performance Verified",
  RESUME_EVIDENCE: "Resume Evidence",
  GITHUB_EVIDENCE: "GitHub Evidence",
  NOT_VERIFIED: "Not Verified",
};

export const INTEREST_LEVEL_LABELS: Record<InterestLevel, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const ROLE_READINESS_LABELS: Record<RoleReadinessLevel, string> = {
  NOT_READY: "Not Ready",
  LEARNING: "Learning",
  NEAR_READY: "Near Ready",
  READY: "Ready",
};

export const VERIFIED_STATUSES: VerificationStatus[] = [
  "FACULTY_VERIFIED",
  "PERFORMANCE_VERIFIED",
  "RESUME_EVIDENCE",
  "GITHUB_EVIDENCE",
];

export const DEFAULT_ROLE_INTERESTS = [
  "Web Developer",
  "Software Developer",
  "Java Developer",
  "Python Developer",
  "Data Analyst",
  "AI/ML Engineer",
  "Cybersecurity Analyst",
  "Cloud Engineer",
  "Business Analyst",
  "QA Tester",
];

export const SKILL_CATEGORY_OPTIONS = Object.entries(SKILL_CATEGORY_LABELS).map(
  ([value, label]) => ({ value: value as SkillCategory, label })
);

export const PROFICIENCY_OPTIONS = Object.entries(PROFICIENCY_LABELS).map(
  ([value, label]) => ({ value: value as ProficiencyLevel, label })
);

export const VERIFICATION_OPTIONS = Object.entries(
  VERIFICATION_STATUS_LABELS
).map(([value, label]) => ({
  value: value as VerificationStatus,
  label,
}));

export const INTEREST_LEVEL_OPTIONS = Object.entries(INTEREST_LEVEL_LABELS).map(
  ([value, label]) => ({ value: value as InterestLevel, label })
);

export const ROLE_READINESS_OPTIONS = Object.entries(ROLE_READINESS_LABELS).map(
  ([value, label]) => ({ value: value as RoleReadinessLevel, label })
);

export const SEED_SKILLS: { name: string; category: SkillCategory }[] = [
  { name: "C", category: "PROGRAMMING_LANGUAGE" },
  { name: "C++", category: "PROGRAMMING_LANGUAGE" },
  { name: "Java", category: "PROGRAMMING_LANGUAGE" },
  { name: "Python", category: "PROGRAMMING_LANGUAGE" },
  { name: "JavaScript", category: "PROGRAMMING_LANGUAGE" },
  { name: "HTML", category: "WEB_TECHNOLOGY" },
  { name: "CSS", category: "WEB_TECHNOLOGY" },
  { name: "React", category: "WEB_TECHNOLOGY" },
  { name: "Node.js", category: "WEB_TECHNOLOGY" },
  { name: "Express.js", category: "FRAMEWORK" },
  { name: "MySQL", category: "DATABASE" },
  { name: "PostgreSQL", category: "DATABASE" },
  { name: "MongoDB", category: "DATABASE" },
  { name: "Git", category: "TOOL" },
  { name: "GitHub", category: "TOOL" },
  { name: "VS Code", category: "TOOL" },
  { name: "Postman", category: "TOOL" },
  { name: "AWS", category: "CLOUD" },
  { name: "Azure", category: "CLOUD" },
  { name: "Google Cloud", category: "CLOUD" },
  { name: "Excel", category: "DATA_ANALYTICS" },
  { name: "Power BI", category: "DATA_ANALYTICS" },
  { name: "SQL", category: "DATA_ANALYTICS" },
  { name: "Tableau", category: "DATA_ANALYTICS" },
  { name: "Machine Learning", category: "AI_ML" },
  { name: "Deep Learning", category: "AI_ML" },
  { name: "NLP", category: "AI_ML" },
  { name: "Networking", category: "CYBERSECURITY" },
  { name: "Ethical Hacking", category: "CYBERSECURITY" },
  { name: "Cybersecurity Basics", category: "CYBERSECURITY" },
];

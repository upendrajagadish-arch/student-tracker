import type {
  CodingProfileDataSource,
  CodingProfileSyncStatus,
  CodingProfileVerificationStatus,
} from "@/types/coding-platforms";

export const CODING_VERIFICATION_STATUS_LABELS: Record<
  CodingProfileVerificationStatus,
  string
> = {
  NOT_VERIFIED: "Not Verified",
  PROFILE_LINKED: "Profile Linked",
  MANUALLY_VERIFIED: "Manually Verified",
  CSV_VERIFIED: "CSV Verified",
  PUBLIC_EVIDENCE: "Public Evidence",
  FACULTY_VERIFIED: "Faculty Verified",
};

export const CODING_DATA_SOURCE_LABELS: Record<CodingProfileDataSource, string> =
  {
    MANUAL: "Manual Entry",
    CSV_IMPORT: "CSV Import",
    PUBLIC_PROFILE: "Public Profile",
    API: "API",
    UNKNOWN: "Unknown",
  };

export const CODING_SYNC_STATUS_LABELS: Record<CodingProfileSyncStatus, string> = {
  NOT_SYNCED: "Not Synced",
  SYNCED: "Synced",
  FAILED: "Failed",
  UNSUPPORTED: "Unsupported",
};

export const CODING_VERIFICATION_OPTIONS = Object.entries(
  CODING_VERIFICATION_STATUS_LABELS
).map(([value, label]) => ({
  value: value as CodingProfileVerificationStatus,
  label,
}));

export const CODING_DATA_SOURCE_OPTIONS = Object.entries(
  CODING_DATA_SOURCE_LABELS
).map(([value, label]) => ({
  value: value as CodingProfileDataSource,
  label,
}));

export const DEFAULT_CODING_PLATFORMS = [
  {
    name: "LeetCode",
    slug: "leetcode",
    websiteUrl: "https://leetcode.com",
    supportsManualTracking: true,
    supportsCsvImport: true,
    supportsPublicProfile: false,
    notes: "Manual entry or CSV import from placement reports.",
  },
  {
    name: "HackerRank",
    slug: "hackerrank",
    websiteUrl: "https://www.hackerrank.com",
    supportsManualTracking: true,
    supportsCsvImport: true,
    supportsPublicProfile: false,
  },
  {
    name: "HackerEarth",
    slug: "hackerearth",
    websiteUrl: "https://www.hackerearth.com",
    supportsManualTracking: true,
    supportsCsvImport: true,
    supportsPublicProfile: false,
  },
  {
    name: "CodeChef",
    slug: "codechef",
    websiteUrl: "https://www.codechef.com",
    supportsManualTracking: true,
    supportsCsvImport: true,
    supportsPublicProfile: false,
  },
  {
    name: "GeeksforGeeks",
    slug: "geeksforgeeks",
    websiteUrl: "https://www.geeksforgeeks.org",
    supportsManualTracking: true,
    supportsCsvImport: true,
    supportsPublicProfile: false,
  },
  {
    name: "Codeforces",
    slug: "codeforces",
    websiteUrl: "https://codeforces.com",
    supportsManualTracking: true,
    supportsCsvImport: true,
    supportsPublicProfile: false,
    notes: "Contest rating can be entered manually or via CSV.",
  },
  {
    name: "Coding Ninjas",
    slug: "coding-ninjas",
    websiteUrl: "https://www.codingninjas.com",
    supportsManualTracking: true,
    supportsCsvImport: true,
    supportsPublicProfile: false,
  },
  {
    name: "InterviewBit",
    slug: "interviewbit",
    websiteUrl: "https://www.interviewbit.com",
    supportsManualTracking: true,
    supportsCsvImport: true,
    supportsPublicProfile: false,
  },
  {
    name: "Other",
    slug: "other",
    websiteUrl: null,
    supportsManualTracking: true,
    supportsCsvImport: true,
    supportsPublicProfile: false,
    notes: "Generic platform for custom coding profile tracking.",
  },
] as const;

export const CODING_PLATFORM_ALIASES: Record<string, string> = {
  leetcode: "leetcode",
  "leet code": "leetcode",
  hackerrank: "hackerrank",
  "hacker rank": "hackerrank",
  hackerearth: "hackerearth",
  "hacker earth": "hackerearth",
  codechef: "codechef",
  "code chef": "codechef",
  geeksforgeeks: "geeksforgeeks",
  gfg: "geeksforgeeks",
  "geeks for geeks": "geeksforgeeks",
  codeforces: "codeforces",
  "code forces": "codeforces",
  cf: "codeforces",
  "coding ninjas": "coding-ninjas",
  codingninjas: "coding-ninjas",
  interviewbit: "interviewbit",
  "interview bit": "interviewbit",
  other: "other",
};

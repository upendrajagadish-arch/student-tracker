import type {
  AccessRequestStatus,
  CodingPlatformApiStatus,
  CodingPlatformCredentialStatus,
  CodingPlatformSyncMode,
} from "@/types/coding-platform-integrations";

export const SYNC_MODE_LABELS: Record<CodingPlatformSyncMode, string> = {
  PUBLIC_API: "Public API",
  ENTERPRISE_API: "Enterprise API",
  PARTNER_API: "Partner API",
  CSV_ONLY: "CSV Only",
  MANUAL_ONLY: "Manual Only",
  UNSUPPORTED: "Unsupported",
};

export const API_STATUS_LABELS: Record<CodingPlatformApiStatus, string> = {
  NOT_CONFIGURED: "Not Configured",
  CONFIGURED: "Configured",
  TESTED: "Tested",
  FAILED: "Failed",
  RATE_LIMITED: "Rate Limited",
  DISABLED: "Disabled",
};

export const CREDENTIAL_STATUS_LABELS: Record<
  CodingPlatformCredentialStatus,
  string
> = {
  NOT_REQUIRED: "Not Required",
  MISSING: "Missing",
  CONFIGURED: "Configured",
  INVALID: "Invalid",
};

export const ACCESS_REQUEST_STATUS_LABELS: Record<AccessRequestStatus, string> =
  {
    NOT_REQUIRED: "Not Required",
    NOT_REQUESTED: "Not Requested",
    REQUESTED: "Requested",
    IN_REVIEW: "In Review",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    NOT_AVAILABLE: "Not Available",
  };

export interface PlatformIntegrationDefaults {
  syncMode: CodingPlatformSyncMode;
  credentialStatus: CodingPlatformCredentialStatus;
  accessRequestStatus: AccessRequestStatus;
  enabled: boolean;
  documentationUrl: string | null;
  setupInstructions: string;
  requiredCredentialFields: string[];
  liveSyncSupported: boolean;
}

export const PLATFORM_INTEGRATION_DEFAULTS: Record<
  string,
  PlatformIntegrationDefaults
> = {
  codeforces: {
    syncMode: "PUBLIC_API",
    credentialStatus: "NOT_REQUIRED",
    accessRequestStatus: "NOT_REQUIRED",
    enabled: true,
    documentationUrl: "https://codeforces.com/apiHelp",
    setupInstructions:
      "Codeforces provides a free public API. Enable integration and ensure each student profile has a Codeforces handle. No API key is required.",
    requiredCredentialFields: [],
    liveSyncSupported: true,
  },
  hackerrank: {
    syncMode: "ENTERPRISE_API",
    credentialStatus: "MISSING",
    accessRequestStatus: "NOT_REQUESTED",
    enabled: false,
    documentationUrl: "https://www.hackerrank.com/work/products/api",
    setupInstructions:
      "Request HackerRank for Work / Enterprise API access from HackerRank sales. Store the API key or access token here after approval. Public practice profiles cannot be synced via unofficial APIs.",
    requiredCredentialFields: ["apiKey or accessToken"],
    liveSyncSupported: false,
  },
  hackerearth: {
    syncMode: "PARTNER_API",
    credentialStatus: "MISSING",
    accessRequestStatus: "NOT_REQUESTED",
    enabled: false,
    documentationUrl:
      "https://www.hackerearth.com/recruiters/api-integration/",
    setupInstructions:
      "Obtain client_id and client_secret from HackerEarth Recruiter dashboard. Candidate reports require test_id and candidate email per sync.",
    requiredCredentialFields: ["clientId", "clientSecret"],
    liveSyncSupported: false,
  },
  leetcode: {
    syncMode: "CSV_ONLY",
    credentialStatus: "NOT_REQUIRED",
    accessRequestStatus: "NOT_AVAILABLE",
    enabled: false,
    documentationUrl: null,
    setupInstructions:
      "Live API sync is not supported yet. Use manual entry or CSV import for LeetCode profiles.",
    requiredCredentialFields: [],
    liveSyncSupported: false,
  },
  codechef: {
    syncMode: "CSV_ONLY",
    credentialStatus: "NOT_REQUIRED",
    accessRequestStatus: "NOT_AVAILABLE",
    enabled: false,
    documentationUrl: null,
    setupInstructions:
      "Live API sync is not supported yet. Use manual entry or CSV import.",
    requiredCredentialFields: [],
    liveSyncSupported: false,
  },
  geeksforgeeks: {
    syncMode: "CSV_ONLY",
    credentialStatus: "NOT_REQUIRED",
    accessRequestStatus: "NOT_AVAILABLE",
    enabled: false,
    documentationUrl: null,
    setupInstructions:
      "Live API sync is not supported yet. Use manual entry or CSV import.",
    requiredCredentialFields: [],
    liveSyncSupported: false,
  },
  "coding-ninjas": {
    syncMode: "MANUAL_ONLY",
    credentialStatus: "NOT_REQUIRED",
    accessRequestStatus: "NOT_REQUESTED",
    enabled: false,
    documentationUrl: null,
    setupInstructions:
      "Partner API access may be available through institutional agreement. Until then, use manual entry or CSV import.",
    requiredCredentialFields: [],
    liveSyncSupported: false,
  },
  interviewbit: {
    syncMode: "CSV_ONLY",
    credentialStatus: "NOT_REQUIRED",
    accessRequestStatus: "NOT_AVAILABLE",
    enabled: false,
    documentationUrl: null,
    setupInstructions:
      "Live API sync is not supported yet. Use manual entry or CSV import.",
    requiredCredentialFields: [],
    liveSyncSupported: false,
  },
  other: {
    syncMode: "UNSUPPORTED",
    credentialStatus: "NOT_REQUIRED",
    accessRequestStatus: "NOT_AVAILABLE",
    enabled: false,
    documentationUrl: null,
    setupInstructions: "Generic platform — manual tracking only.",
    requiredCredentialFields: [],
    liveSyncSupported: false,
  },
};

export function getPlatformDefaults(slug: string): PlatformIntegrationDefaults {
  return (
    PLATFORM_INTEGRATION_DEFAULTS[slug] ?? PLATFORM_INTEGRATION_DEFAULTS.other
  );
}

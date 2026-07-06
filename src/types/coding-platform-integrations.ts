export type CodingPlatformSyncMode =
  | "PUBLIC_API"
  | "ENTERPRISE_API"
  | "PARTNER_API"
  | "CSV_ONLY"
  | "MANUAL_ONLY"
  | "UNSUPPORTED";

export type CodingPlatformApiStatus =
  | "NOT_CONFIGURED"
  | "CONFIGURED"
  | "TESTED"
  | "FAILED"
  | "RATE_LIMITED"
  | "DISABLED";

export type CodingPlatformCredentialStatus =
  | "NOT_REQUIRED"
  | "MISSING"
  | "CONFIGURED"
  | "INVALID";

export type AccessRequestStatus =
  | "NOT_REQUIRED"
  | "NOT_REQUESTED"
  | "REQUESTED"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "NOT_AVAILABLE";

export interface CodingPlatformIntegrationSafe {
  id: string;
  platformId: string;
  platformName: string;
  platformSlug: string;
  websiteUrl: string | null;
  syncMode: CodingPlatformSyncMode;
  apiStatus: CodingPlatformApiStatus;
  credentialStatus: CodingPlatformCredentialStatus;
  baseUrl: string | null;
  hasCredentials: boolean;
  credentialFieldsConfigured: string[];
  testConnectionStatus: string | null;
  testConnectionMessage: string | null;
  lastTestedAt: string | null;
  lastSuccessfulSyncAt: string | null;
  contactPerson: string | null;
  vendorContactEmail: string | null;
  accessRequestStatus: AccessRequestStatus;
  accessRequestNotes: string | null;
  documentationUrl: string | null;
  enabled: boolean;
  liveSyncSupported: boolean;
  setupInstructions: string;
  requiredCredentialFields: string[];
  updatedAt: string;
}

export interface UpdateIntegrationSettingsInput {
  enabled?: boolean;
  baseUrl?: string | null;
  contactPerson?: string | null;
  vendorContactEmail?: string | null;
  documentationUrl?: string | null;
  accessRequestNotes?: string | null;
}

export interface SavePlatformCredentialsInput {
  apiKey?: string;
  accessToken?: string;
  teamId?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface TestPlatformConnectionInput {
  testHandle?: string;
  testId?: string;
  candidateEmail?: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  apiStatus: CodingPlatformApiStatus;
}

export interface UpdateAccessRequestInput {
  accessRequestStatus: AccessRequestStatus;
  accessRequestNotes?: string | null;
  contactPerson?: string | null;
  vendorContactEmail?: string | null;
}

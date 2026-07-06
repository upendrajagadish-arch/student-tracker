import { prisma } from "@/lib/db";
import {
  getPlatformDefaults,
  PLATFORM_INTEGRATION_DEFAULTS,
} from "@/lib/coding-integration-constants";
import { getCodingIntegrationConfig } from "@/lib/coding-integration-config";
import {
  decryptCredentials,
  encryptCredentials,
} from "@/lib/integration-crypto";
import { ensureCodingPlatformsSeeded } from "@/lib/services/coding-platforms";
import { logAudit } from "@/lib/services/audit";
import type { UserRole } from "@/types";
import type {
  AccessRequestStatus,
  CodingPlatformApiStatus,
  CodingPlatformCredentialStatus,
  CodingPlatformIntegrationSafe,
  CodingPlatformSyncMode,
  SavePlatformCredentialsInput,
  TestConnectionResult,
  TestPlatformConnectionInput,
  UpdateAccessRequestInput,
  UpdateIntegrationSettingsInput,
} from "@/types/coding-platform-integrations";
import type {
  AccessRequestStatus as PrismaAccessRequestStatus,
  CodingPlatformApiStatus as PrismaApiStatus,
  CodingPlatformCredentialStatus as PrismaCredentialStatus,
  CodingPlatformSyncMode as PrismaSyncMode,
} from "@prisma/client";

function credentialFieldsFromStored(
  creds: Record<string, string> | null,
  slug: string
): string[] {
  if (!creds) return [];
  const fields: string[] = [];
  if (slug === "hackerrank") {
    if (creds.apiKey) fields.push("apiKey");
    if (creds.accessToken) fields.push("accessToken");
    if (creds.teamId) fields.push("teamId");
  }
  if (slug === "hackerearth") {
    if (creds.clientId) fields.push("clientId");
    if (creds.clientSecret) fields.push("clientSecret");
  }
  return fields;
}

function resolveCredentialStatus(
  slug: string,
  creds: Record<string, string> | null
): CodingPlatformCredentialStatus {
  const defaults = getPlatformDefaults(slug);
  if (defaults.requiredCredentialFields.length === 0) return "NOT_REQUIRED";
  if (!creds) return "MISSING";
  if (slug === "hackerrank") {
    return creds.apiKey || creds.accessToken ? "CONFIGURED" : "MISSING";
  }
  if (slug === "hackerearth") {
    return creds.clientId && creds.clientSecret ? "CONFIGURED" : "MISSING";
  }
  return "MISSING";
}

function mapSafeIntegration(row: {
  id: string;
  platformId: string;
  syncMode: PrismaSyncMode;
  apiStatus: PrismaApiStatus;
  credentialStatus: PrismaCredentialStatus;
  baseUrl: string | null;
  encryptedCredentialsJson: string | null;
  testConnectionStatus: string | null;
  testConnectionMessage: string | null;
  lastTestedAt: Date | null;
  lastSuccessfulSyncAt: Date | null;
  contactPerson: string | null;
  vendorContactEmail: string | null;
  accessRequestStatus: PrismaAccessRequestStatus;
  accessRequestNotes: string | null;
  documentationUrl: string | null;
  enabled: boolean;
  updatedAt: Date;
  platform: {
    name: string;
    slug: string;
    websiteUrl: string | null;
  };
}): CodingPlatformIntegrationSafe {
  const defaults = getPlatformDefaults(row.platform.slug);
  const creds = decryptCredentials(row.encryptedCredentialsJson);
  const credentialFields = credentialFieldsFromStored(creds, row.platform.slug);
  const credentialStatus = resolveCredentialStatus(row.platform.slug, creds);

  return {
    id: row.id,
    platformId: row.platformId,
    platformName: row.platform.name,
    platformSlug: row.platform.slug,
    websiteUrl: row.platform.websiteUrl,
    syncMode: row.syncMode as CodingPlatformSyncMode,
    apiStatus: row.apiStatus as CodingPlatformApiStatus,
    credentialStatus,
    baseUrl: row.baseUrl,
    hasCredentials: credentialFields.length > 0,
    credentialFieldsConfigured: credentialFields,
    testConnectionStatus: row.testConnectionStatus,
    testConnectionMessage: row.testConnectionMessage,
    lastTestedAt: row.lastTestedAt?.toISOString() ?? null,
    lastSuccessfulSyncAt: row.lastSuccessfulSyncAt?.toISOString() ?? null,
    contactPerson: row.contactPerson,
    vendorContactEmail: row.vendorContactEmail,
    accessRequestStatus: row.accessRequestStatus as AccessRequestStatus,
    accessRequestNotes: row.accessRequestNotes,
    documentationUrl: row.documentationUrl ?? defaults.documentationUrl,
    enabled: row.enabled,
    liveSyncSupported: defaults.liveSyncSupported && row.enabled,
    setupInstructions: defaults.setupInstructions,
    requiredCredentialFields: defaults.requiredCredentialFields,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function ensureIntegrationsSeeded(): Promise<void> {
  await ensureCodingPlatformsSeeded();
  const platforms = await prisma.codingPlatform.findMany({
    where: { isActive: true },
  });

  for (const platform of platforms) {
    const defaults = getPlatformDefaults(platform.slug);
    await prisma.codingPlatformIntegration.upsert({
      where: { platformId: platform.id },
      create: {
        platformId: platform.id,
        syncMode: defaults.syncMode,
        credentialStatus: defaults.credentialStatus,
        accessRequestStatus: defaults.accessRequestStatus,
        documentationUrl: defaults.documentationUrl,
        enabled: defaults.enabled,
        apiStatus: defaults.enabled ? "CONFIGURED" : "NOT_CONFIGURED",
      },
      update: {},
    });
  }
}

export async function getIntegrations(): Promise<CodingPlatformIntegrationSafe[]> {
  await ensureIntegrationsSeeded();
  const rows = await prisma.codingPlatformIntegration.findMany({
    include: {
      platform: {
        select: { name: true, slug: true, websiteUrl: true },
      },
    },
    orderBy: { platform: { name: "asc" } },
  });
  return rows.map(mapSafeIntegration);
}

export async function getIntegration(
  platformId: string
): Promise<CodingPlatformIntegrationSafe | null> {
  await ensureIntegrationsSeeded();
  const row = await prisma.codingPlatformIntegration.findUnique({
    where: { platformId },
    include: {
      platform: {
        select: { name: true, slug: true, websiteUrl: true },
      },
    },
  });
  return row ? mapSafeIntegration(row) : null;
}

export async function getIntegrationBySlug(
  slug: string
): Promise<CodingPlatformIntegrationSafe | null> {
  await ensureIntegrationsSeeded();
  const platform = await prisma.codingPlatform.findUnique({ where: { slug } });
  if (!platform) return null;
  return getIntegration(platform.id);
}

export async function getSafeIntegrationStatus(
  platformSlug: string
): Promise<CodingPlatformIntegrationSafe | null> {
  return getIntegrationBySlug(platformSlug);
}

export function getPlatformSyncMode(slug: string): CodingPlatformSyncMode {
  return getPlatformDefaults(slug).syncMode;
}

export async function canPlatformLiveSync(
  platformSlug: string
): Promise<{ allowed: boolean; reason: string }> {
  const integration = await getIntegrationBySlug(platformSlug);
  const defaults = getPlatformDefaults(platformSlug);

  if (!defaults.liveSyncSupported) {
    return {
      allowed: false,
      reason: "Live sync not supported. Use CSV/manual import.",
    };
  }

  if (!integration) {
    return { allowed: false, reason: "Integration not configured." };
  }

  if (!integration.enabled) {
    return { allowed: false, reason: "Platform integration is disabled." };
  }

  if (integration.apiStatus === "DISABLED") {
    return { allowed: false, reason: "Platform integration is disabled." };
  }

  if (integration.syncMode === "PUBLIC_API") {
    return { allowed: true, reason: "Public API sync available." };
  }

  if (
    integration.syncMode === "ENTERPRISE_API" ||
    integration.syncMode === "PARTNER_API"
  ) {
    if (integration.credentialStatus !== "CONFIGURED") {
      return {
        allowed: false,
        reason: "Enterprise credentials missing. Configure in Integration Center.",
      };
    }
    if (integration.apiStatus !== "TESTED" && integration.apiStatus !== "CONFIGURED") {
      return {
        allowed: false,
        reason: "Test connection before enabling live sync.",
      };
    }
    return { allowed: true, reason: "Enterprise API configured." };
  }

  return {
    allowed: false,
    reason: "Live sync not supported. Use CSV/manual import.",
  };
}

export async function updateIntegrationSettings(
  platformId: string,
  input: UpdateIntegrationSettingsInput,
  options: { actorUserId: string; actorRole: UserRole }
): Promise<CodingPlatformIntegrationSafe> {
  await ensureIntegrationsSeeded();
  const existing = await prisma.codingPlatformIntegration.findUnique({
    where: { platformId },
    include: { platform: { select: { name: true, slug: true, websiteUrl: true } } },
  });
  if (!existing) throw new Error("Integration not found");

  const row = await prisma.codingPlatformIntegration.update({
    where: { platformId },
    data: {
      ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      ...(input.baseUrl !== undefined ? { baseUrl: input.baseUrl } : {}),
      ...(input.contactPerson !== undefined
        ? { contactPerson: input.contactPerson }
        : {}),
      ...(input.vendorContactEmail !== undefined
        ? { vendorContactEmail: input.vendorContactEmail }
        : {}),
      ...(input.documentationUrl !== undefined
        ? { documentationUrl: input.documentationUrl }
        : {}),
      ...(input.accessRequestNotes !== undefined
        ? { accessRequestNotes: input.accessRequestNotes }
        : {}),
      updatedByUserId: options.actorUserId,
      apiStatus:
        input.enabled === false
          ? "DISABLED"
          : existing.apiStatus === "DISABLED"
            ? "NOT_CONFIGURED"
            : existing.apiStatus,
    },
    include: {
      platform: { select: { name: true, slug: true, websiteUrl: true } },
    },
  });

  await logAudit({
    actorUserId: options.actorUserId,
    actorRole: options.actorRole,
    action: "CODING_INTEGRATION_SETTINGS_UPDATED",
    entityType: "CodingPlatformIntegration",
    entityId: row.id,
    description: `Updated integration settings for ${row.platform.name}`,
  });

  return mapSafeIntegration(row);
}

export async function savePlatformCredentials(
  platformId: string,
  input: SavePlatformCredentialsInput,
  options: { actorUserId: string; actorRole: UserRole }
): Promise<CodingPlatformIntegrationSafe> {
  await ensureIntegrationsSeeded();
  const existing = await prisma.codingPlatformIntegration.findUnique({
    where: { platformId },
    include: { platform: { select: { name: true, slug: true, websiteUrl: true } } },
  });
  if (!existing) throw new Error("Integration not found");

  const slug = existing.platform.slug;
  const defaults = getPlatformDefaults(slug);

  if (defaults.requiredCredentialFields.length === 0) {
    throw new Error("This platform does not require credentials.");
  }

  const current = decryptCredentials(existing.encryptedCredentialsJson) ?? {};
  const merged: Record<string, string> = { ...current };

  if (input.apiKey?.trim()) merged.apiKey = input.apiKey.trim();
  if (input.accessToken?.trim()) merged.accessToken = input.accessToken.trim();
  if (input.teamId?.trim()) merged.teamId = input.teamId.trim();
  if (input.clientId?.trim()) merged.clientId = input.clientId.trim();
  if (input.clientSecret?.trim()) merged.clientSecret = input.clientSecret.trim();

  const credentialStatus = resolveCredentialStatus(slug, merged);

  const row = await prisma.codingPlatformIntegration.update({
    where: { platformId },
    data: {
      encryptedCredentialsJson: encryptCredentials(merged),
      credentialStatus,
      apiStatus: credentialStatus === "CONFIGURED" ? "CONFIGURED" : "NOT_CONFIGURED",
      updatedByUserId: options.actorUserId,
    },
    include: {
      platform: { select: { name: true, slug: true, websiteUrl: true } },
    },
  });

  await logAudit({
    actorUserId: options.actorUserId,
    actorRole: options.actorRole,
    action: "CODING_INTEGRATION_CREDENTIALS_SAVED",
    entityType: "CodingPlatformIntegration",
    entityId: row.id,
    description: `Saved credentials for ${row.platform.name} (fields only, secrets not logged)`,
  });

  return mapSafeIntegration(row);
}

async function testCodeforcesConnection(
  testHandle?: string
): Promise<TestConnectionResult> {
  const config = getCodingIntegrationConfig();
  const handle = (testHandle?.trim() || config.codeforcesTestHandle).toLowerCase();
  const url = `${config.codeforcesApiBaseUrl}/user.info?handles=${encodeURIComponent(handle)}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { Accept: "application/json" },
    });
    const data = (await res.json()) as {
      status: string;
      comment?: string;
      result?: unknown[];
    };

    if (data.status === "OK" && Array.isArray(data.result) && data.result.length > 0) {
      return {
        success: true,
        message: `Codeforces API reachable. Verified handle: ${handle}.`,
        apiStatus: "TESTED",
      };
    }

    return {
      success: false,
      message: data.comment ?? "Codeforces API returned an unexpected response.",
      apiStatus: "FAILED",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Codeforces API request failed";
    return {
      success: false,
      message,
      apiStatus: "FAILED",
    };
  }
}

async function testHackerRankConnection(
  creds: Record<string, string> | null
): Promise<TestConnectionResult> {
  if (!creds?.apiKey && !creds?.accessToken) {
    return {
      success: false,
      message: "API key or access token is required.",
      apiStatus: "NOT_CONFIGURED",
    };
  }

  const config = getCodingIntegrationConfig();
  const token = creds.accessToken ?? creds.apiKey;

  try {
    const res = await fetch(`${config.hackerrankApiBaseUrl}/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      return {
        success: true,
        message: "HackerRank API authenticated successfully.",
        apiStatus: "TESTED",
      };
    }

    if (res.status === 401 || res.status === 403) {
      return {
        success: false,
        message:
          "Credentials saved but authentication failed. Verify your enterprise API token.",
        apiStatus: "CONFIGURED",
      };
    }

    return {
      success: true,
      message:
        "Credentials saved. HackerRank enterprise endpoint requires manual verification — no safe public test endpoint confirmed.",
      apiStatus: "CONFIGURED",
    };
  } catch {
    return {
      success: true,
      message:
        "Credentials saved. Configured — manual verification required for HackerRank enterprise API.",
      apiStatus: "CONFIGURED",
    };
  }
}

async function testHackerEarthConnection(
  creds: Record<string, string> | null,
  input: TestPlatformConnectionInput
): Promise<TestConnectionResult> {
  if (!creds?.clientId || !creds?.clientSecret) {
    return {
      success: false,
      message: "client_id and client_secret are required.",
      apiStatus: "NOT_CONFIGURED",
    };
  }

  if (!input.testId?.trim() || !input.candidateEmail?.trim()) {
    return {
      success: true,
      message:
        "Credentials saved. Provide test_id and candidate email to test candidate report API.",
      apiStatus: "CONFIGURED",
    };
  }

  const config = getCodingIntegrationConfig();
  const url = `${config.hackerearthApiBaseUrl}/v3/partner/candidate-report/${encodeURIComponent(input.testId.trim())}/`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        email: input.candidateEmail.trim(),
      }),
      signal: AbortSignal.timeout(20000),
    });

    const data = (await res.json().catch(() => ({}))) as {
      message?: string;
      error?: string;
    };

    if (res.ok) {
      return {
        success: true,
        message: "HackerEarth candidate report API responded successfully.",
        apiStatus: "TESTED",
      };
    }

    return {
      success: false,
      message:
        data.message ?? data.error ?? `HackerEarth API returned HTTP ${res.status}`,
      apiStatus: "FAILED",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "HackerEarth API request failed";
    return {
      success: false,
      message,
      apiStatus: "FAILED",
    };
  }
}

export async function testPlatformConnection(
  platformId: string,
  input: TestPlatformConnectionInput = {},
  options?: { actorUserId: string; actorRole: UserRole }
): Promise<TestConnectionResult> {
  await ensureIntegrationsSeeded();
  const existing = await prisma.codingPlatformIntegration.findUnique({
    where: { platformId },
    include: { platform: { select: { name: true, slug: true, websiteUrl: true } } },
  });
  if (!existing) throw new Error("Integration not found");

  const slug = existing.platform.slug;
  const defaults = getPlatformDefaults(slug);
  const creds = decryptCredentials(existing.encryptedCredentialsJson);

  let result: TestConnectionResult;

  if (!defaults.liveSyncSupported && slug !== "hackerrank" && slug !== "hackerearth") {
    result = {
      success: false,
      message: "Live sync not supported. Use CSV/manual import.",
      apiStatus: "NOT_CONFIGURED",
    };
  } else if (slug === "codeforces") {
    result = await testCodeforcesConnection(input.testHandle);
  } else if (slug === "hackerrank") {
    result = await testHackerRankConnection(creds);
  } else if (slug === "hackerearth") {
    result = await testHackerEarthConnection(creds, input);
  } else {
    result = {
      success: false,
      message: "Live sync not supported for this platform.",
      apiStatus: "NOT_CONFIGURED",
    };
  }

  await prisma.codingPlatformIntegration.update({
    where: { platformId },
    data: {
      testConnectionStatus: result.success ? "SUCCESS" : "FAILED",
      testConnectionMessage: result.message,
      lastTestedAt: new Date(),
      apiStatus: result.apiStatus,
      ...(result.success ? { lastSuccessfulSyncAt: new Date() } : {}),
      updatedByUserId: options?.actorUserId ?? null,
    },
  });

  if (options) {
    await logAudit({
      actorUserId: options.actorUserId,
      actorRole: options.actorRole,
      action: result.success
        ? "CODING_INTEGRATION_CONNECTION_TESTED"
        : "CODING_INTEGRATION_CONNECTION_FAILED",
      entityType: "CodingPlatformIntegration",
      entityId: existing.id,
      description: `Connection test for ${existing.platform.name}: ${result.message}`,
    });
  }

  return result;
}

export async function markAccessRequestStatus(
  platformId: string,
  input: UpdateAccessRequestInput,
  options: { actorUserId: string; actorRole: UserRole }
): Promise<CodingPlatformIntegrationSafe> {
  await ensureIntegrationsSeeded();
  const row = await prisma.codingPlatformIntegration.update({
    where: { platformId },
    data: {
      accessRequestStatus: input.accessRequestStatus,
      ...(input.accessRequestNotes !== undefined
        ? { accessRequestNotes: input.accessRequestNotes }
        : {}),
      ...(input.contactPerson !== undefined
        ? { contactPerson: input.contactPerson }
        : {}),
      ...(input.vendorContactEmail !== undefined
        ? { vendorContactEmail: input.vendorContactEmail }
        : {}),
      updatedByUserId: options.actorUserId,
    },
    include: {
      platform: { select: { name: true, slug: true, websiteUrl: true } },
    },
  });

  await logAudit({
    actorUserId: options.actorUserId,
    actorRole: options.actorRole,
    action: "CODING_INTEGRATION_ACCESS_REQUEST_UPDATED",
    entityType: "CodingPlatformIntegration",
    entityId: row.id,
    description: `Access request status for ${row.platform.name}: ${input.accessRequestStatus}`,
  });

  return mapSafeIntegration(row);
}

export function listSupportedPlatformSlugs(): string[] {
  return Object.keys(PLATFORM_INTEGRATION_DEFAULTS);
}

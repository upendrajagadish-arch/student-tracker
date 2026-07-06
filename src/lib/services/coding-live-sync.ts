import { prisma } from "@/lib/db";
import { getCodingIntegrationConfig } from "@/lib/coding-integration-config";
import {
  canPlatformLiveSync,
  getIntegrationBySlug,
} from "@/lib/services/coding-platform-integrations";
import { logAudit } from "@/lib/services/audit";
import type { CodingProfileSyncStatus } from "@/types/coding-platforms";

export interface CodingLiveSyncResult {
  success: boolean;
  syncStatus: CodingProfileSyncStatus;
  message: string;
  contestRating?: number | null;
  globalRank?: number | null;
}

interface CodeforcesUserInfo {
  rating?: number;
  rank?: string;
  maxRating?: number;
}

async function fetchCodeforcesUser(
  handle: string
): Promise<{ ok: boolean; user?: CodeforcesUserInfo; error?: string }> {
  const config = getCodingIntegrationConfig();
  const url = `${config.codeforcesApiBaseUrl}/user.info?handles=${encodeURIComponent(handle)}`;

  try {
    await new Promise((r) => setTimeout(r, config.syncRequestDelayMs));
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { Accept: "application/json" },
    });
    const data = (await res.json()) as {
      status: string;
      comment?: string;
      result?: CodeforcesUserInfo[];
    };

    if (data.status === "OK" && data.result?.[0]) {
      return { ok: true, user: data.result[0] };
    }
    return { ok: false, error: data.comment ?? "User not found on Codeforces" };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Codeforces API failed",
    };
  }
}

export async function syncStudentCodingProfileFromApi(
  profileId: string,
  options?: { actorUserId?: string }
): Promise<CodingLiveSyncResult> {
  const profile = await prisma.studentCodingProfile.findUnique({
    where: { id: profileId },
    include: { platform: true },
  });

  if (!profile) {
    return {
      success: false,
      syncStatus: "FAILED",
      message: "Coding profile not found.",
    };
  }

  const slug = profile.platform.slug;
  const gate = await canPlatformLiveSync(slug);

  if (!gate.allowed) {
    await prisma.studentCodingProfile.update({
      where: { id: profileId },
      data: {
        syncStatus: "UNSUPPORTED",
        syncError: gate.reason,
      },
    });
    return {
      success: false,
      syncStatus: "UNSUPPORTED",
      message: gate.reason,
    };
  }

  if (!profile.username?.trim()) {
    return {
      success: false,
      syncStatus: "FAILED",
      message: "Student handle/username is required for API sync.",
    };
  }

  if (slug === "codeforces") {
    const result = await fetchCodeforcesUser(profile.username.trim());

    if (!result.ok || !result.user) {
      await prisma.studentCodingProfile.update({
        where: { id: profileId },
        data: {
          syncStatus: "FAILED",
          syncError: result.error ?? "Sync failed",
          lastSyncedAt: new Date(),
        },
      });

      if (options?.actorUserId) {
        await logAudit({
          actorUserId: options.actorUserId,
          action: "CODING_PROFILE_SYNC_FAILED",
          entityType: "StudentCodingProfile",
          entityId: profileId,
          description: `Codeforces sync failed for ${profile.username}: ${result.error}`,
        });
      }

      return {
        success: false,
        syncStatus: "FAILED",
        message: result.error ?? "Sync failed",
      };
    }

    const rating = result.user.rating ?? null;
    await prisma.studentCodingProfile.update({
      where: { id: profileId },
      data: {
        contestRating: rating,
        syncStatus: "SYNCED",
        syncError: null,
        dataSource: "API",
        lastSyncedAt: new Date(),
      },
    });

    const integration = await getIntegrationBySlug(slug);
    if (integration) {
      await prisma.codingPlatformIntegration.update({
        where: { platformId: integration.platformId },
        data: { lastSuccessfulSyncAt: new Date() },
      });
    }

    return {
      success: true,
      syncStatus: "SYNCED",
      message: `Synced Codeforces rating for ${profile.username}.`,
      contestRating: rating,
    };
  }

  return {
    success: false,
    syncStatus: "UNSUPPORTED",
    message: "Live sync provider not implemented for this platform yet.",
  };
}

export async function getLiveSyncBlockReason(
  platformSlug: string
): Promise<string | null> {
  const gate = await canPlatformLiveSync(platformSlug);
  return gate.allowed ? null : gate.reason;
}

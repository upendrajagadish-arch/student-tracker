import type { GitHubSyncStatus } from "@/types/github";

export const GITHUB_SYNC_STATUS_LABELS: Record<GitHubSyncStatus, string> = {
  NOT_SYNCED: "Not Synced",
  SYNCED: "Synced",
  FAILED: "Failed",
  RATE_LIMITED: "Rate Limited",
};

export const GITHUB_SYNC_STATUS_OPTIONS = Object.entries(
  GITHUB_SYNC_STATUS_LABELS
).map(([value, label]) => ({
  value: value as GitHubSyncStatus,
  label,
}));

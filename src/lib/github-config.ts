export interface GitHubConfig {
  token: string | undefined;
  baseUrl: string;
  syncRepoLimit: number;
  timeoutMs: number;
  hasToken: boolean;
}

let cachedConfig: GitHubConfig | null = null;

export function getGitHubConfig(): GitHubConfig {
  if (cachedConfig) return cachedConfig;

  const token = process.env.GITHUB_TOKEN?.trim() || undefined;
  const baseUrl =
    process.env.GITHUB_API_BASE_URL?.trim() || "https://api.github.com";
  const syncRepoLimit = Math.max(
    1,
    Number(process.env.GITHUB_SYNC_REPO_LIMIT) || 20
  );
  const timeoutMs = Math.max(
    1000,
    Number(process.env.GITHUB_SYNC_TIMEOUT_MS) || 10000
  );

  cachedConfig = {
    token,
    baseUrl: baseUrl.replace(/\/$/, ""),
    syncRepoLimit,
    timeoutMs,
    hasToken: Boolean(token),
  };

  return cachedConfig;
}

export function getGitHubRateLimitWarning(): string | null {
  const config = getGitHubConfig();
  if (config.hasToken) return null;
  return "Using unauthenticated GitHub API (60 requests/hour). Set GITHUB_TOKEN for higher rate limits.";
}

export function getCodingIntegrationConfig() {
  return {
    codeforcesApiBaseUrl:
      process.env.CODEFORCES_API_BASE_URL ?? "https://codeforces.com/api",
    hackerrankApiBaseUrl:
      process.env.HACKERRANK_API_BASE_URL ?? "https://www.hackerrank.com/x/api/v3",
    hackerearthApiBaseUrl:
      process.env.HACKEREARTH_API_BASE_URL ??
      "https://api.hackerearth.com/partner/hackerearth",
    syncRequestDelayMs: Number(process.env.CODING_SYNC_REQUEST_DELAY_MS ?? 500),
    syncBulkLimit: Number(process.env.CODING_SYNC_BULK_LIMIT ?? 50),
    codeforcesTestHandle: "tourist",
  };
}

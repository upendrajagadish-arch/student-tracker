export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { validateServerEnv } = await import("@/lib/env");
      validateServerEnv();
    } catch (error) {
      // Do not crash the server — public routes should render with fallbacks.
      // Auth and API routes will fail clearly when secrets/DB are missing.
      console.error("[PlacementIQ] Environment validation failed:", error);
    }
  }
}

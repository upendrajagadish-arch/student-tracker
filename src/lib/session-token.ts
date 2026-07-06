import { createHmac, timingSafeEqual } from "crypto";
import { getSessionSecret } from "@/lib/env";

const TOKEN_VERSION = "v1";
const SESSION_COOKIE = "placementiq_session";

export { SESSION_COOKIE };

export function signSessionToken(userId: string): string {
  const signature = createHmac("sha256", getSessionSecret())
    .update(`${TOKEN_VERSION}:${userId}`)
    .digest("base64url");

  return `${TOKEN_VERSION}.${userId}.${signature}`;
}

export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [version, userId, signature] = parts;
  if (version !== TOKEN_VERSION || !userId || !signature) return null;

  const expected = createHmac("sha256", getSessionSecret())
    .update(`${version}:${userId}`)
    .digest("base64url");

  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
  } catch {
    return null;
  }

  return userId;
}

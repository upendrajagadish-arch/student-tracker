import crypto from "crypto";

const SCRYPT_SALT = "placementiq-integration-v1";

function getIntegrationKey(): Buffer {
  const secret =
    process.env.INTEGRATION_SECRET ??
    process.env.SESSION_SECRET ??
    process.env.AUTH_SECRET ??
    "dev-only-integration-secret-32chars!!";
  return crypto.scryptSync(secret, SCRYPT_SALT, 32);
}

export function encryptCredentials(data: Record<string, string>): string {
  const key = getIntegrationKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = JSON.stringify(data);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  });
}

export function decryptCredentials(
  payload: string | null | undefined
): Record<string, string> | null {
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload) as {
      iv: string;
      tag: string;
      data: string;
    };
    const key = getIntegrationKey();
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(parsed.iv, "base64")
    );
    decipher.setAuthTag(Buffer.from(parsed.tag, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(parsed.data, "base64")),
      decipher.final(),
    ]);
    const obj = JSON.parse(decrypted.toString("utf8"));
    if (typeof obj !== "object" || obj === null) return null;
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string") result[k] = v;
    }
    return result;
  } catch {
    return null;
  }
}

export function maskCredential(value: string | undefined): string {
  if (!value) return "";
  if (value.length <= 4) return "••••";
  return `••••${value.slice(-4)}`;
}

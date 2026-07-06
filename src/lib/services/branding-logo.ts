import path from "path";
import {
  LOGO_ALLOWED_EXT,
  LOGO_ALLOWED_MIME,
  LOGO_MAX_BYTES,
  LOGO_STORAGE_PREFIX,
} from "@/lib/branding-constants";
import { getStorageProvider } from "@/lib/storage";
import {
  getAppSettings,
  setInstitutionLogoPath,
} from "@/lib/services/app-settings";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

export function validateLogoFile(file: File): string | null {
  if (file.size > LOGO_MAX_BYTES) {
    return "Logo must be 2 MB or smaller.";
  }
  const ext = path.extname(file.name).toLowerCase();
  if (!LOGO_ALLOWED_EXT.has(ext)) {
    return "Logo must be PNG, JPG, JPEG, or SVG.";
  }
  if (!LOGO_ALLOWED_MIME.has(file.type) && file.type !== "") {
    return "Unsupported logo file type.";
  }
  return null;
}

export async function uploadInstitutionLogo(
  file: File,
  updatedByUserId: string
): Promise<{ settings: Awaited<ReturnType<typeof setInstitutionLogoPath>> }> {
  const error = validateLogoFile(file);
  if (error) throw new Error(error);

  const ext = path.extname(file.name).toLowerCase() || ".png";
  const storagePath = `${LOGO_STORAGE_PREFIX}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const storage = getStorageProvider();
  const settings = await getAppSettings();

  if (settings.institutionLogoPath) {
    try {
      await storage.remove(settings.institutionLogoPath);
    } catch {
      // Previous logo may already be gone
    }
  }

  await storage.save(storagePath, buffer);

  const updated = await setInstitutionLogoPath(storagePath, updatedByUserId);
  return { settings: updated };
}

export async function getInstitutionLogoBuffer(): Promise<{
  buffer: Buffer;
  mimeType: string;
} | null> {
  const settings = await getAppSettings();
  if (!settings.institutionLogoPath) return null;

  const storage = getStorageProvider();
  const exists = await storage.exists(settings.institutionLogoPath);
  if (!exists) return null;

  const buffer = await storage.read(settings.institutionLogoPath);
  const ext = path.extname(settings.institutionLogoPath).toLowerCase();
  const mimeType = MIME_BY_EXT[ext] ?? "application/octet-stream";

  return { buffer, mimeType };
}

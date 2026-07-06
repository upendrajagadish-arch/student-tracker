import { prisma } from "@/lib/db";
import {
  DEFAULT_INSTITUTION_NAME,
  DEFAULT_PLACEMENT_CELL_NAME,
  PRODUCT_NAME,
  PRODUCT_TAGLINE,
} from "@/lib/branding-constants";
import type {
  AppSettingsRecord,
  PublicBrandingSettings,
  UpdateAppSettingsInput,
} from "@/types/branding";

const SETTINGS_ID = "default";

function mapRecord(row: {
  id: string;
  institutionName: string;
  placementCellName: string;
  institutionLogoPath: string | null;
  reportHeaderText: string | null;
  reportFooterText: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  address: string | null;
  defaultAcademicYear: string | null;
  primaryColor: string | null;
  reportSignatureName: string | null;
  reportSignatureDesignation: string | null;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AppSettingsRecord {
  return {
    id: row.id,
    institutionName: row.institutionName,
    placementCellName: row.placementCellName,
    institutionLogoPath: row.institutionLogoPath,
    reportHeaderText: row.reportHeaderText,
    reportFooterText: row.reportFooterText,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    website: row.website,
    address: row.address,
    defaultAcademicYear: row.defaultAcademicYear,
    primaryColor: row.primaryColor,
    reportSignatureName: row.reportSignatureName,
    reportSignatureDesignation: row.reportSignatureDesignation,
    updatedByUserId: row.updatedByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function getLogoPublicUrl(hasLogo: boolean): string | null {
  return hasLogo ? "/api/branding/logo" : null;
}

export async function ensureAppSettings() {
  const existing = await prisma.appSettings.findUnique({
    where: { id: SETTINGS_ID },
  });
  if (existing) return existing;

  return prisma.appSettings.create({
    data: {
      id: SETTINGS_ID,
      institutionName: DEFAULT_INSTITUTION_NAME,
      placementCellName: DEFAULT_PLACEMENT_CELL_NAME,
    },
  });
}

export async function getAppSettings(): Promise<AppSettingsRecord> {
  const row = await ensureAppSettings();
  return mapRecord(row);
}

export function toPublicBranding(
  settings: AppSettingsRecord
): PublicBrandingSettings {
  return {
    institutionName: settings.institutionName || DEFAULT_INSTITUTION_NAME,
    placementCellName: settings.placementCellName || DEFAULT_PLACEMENT_CELL_NAME,
    productName: PRODUCT_NAME,
    tagline: PRODUCT_TAGLINE,
    logoUrl: getLogoPublicUrl(Boolean(settings.institutionLogoPath)),
    reportHeaderText: settings.reportHeaderText,
    reportFooterText: settings.reportFooterText,
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    website: settings.website,
    address: settings.address,
    defaultAcademicYear: settings.defaultAcademicYear,
    primaryColor: settings.primaryColor,
    reportSignatureName: settings.reportSignatureName,
    reportSignatureDesignation: settings.reportSignatureDesignation,
  };
}

export function getDefaultPublicBrandingSettings(): PublicBrandingSettings {
  return {
    institutionName: DEFAULT_INSTITUTION_NAME,
    placementCellName: DEFAULT_PLACEMENT_CELL_NAME,
    productName: PRODUCT_NAME,
    tagline: PRODUCT_TAGLINE,
    logoUrl: null,
    reportHeaderText: null,
    reportFooterText: null,
    contactEmail: null,
    contactPhone: null,
    website: null,
    address: null,
    defaultAcademicYear: null,
    primaryColor: null,
    reportSignatureName: null,
    reportSignatureDesignation: null,
  };
}

export async function getPublicBrandingSettings(): Promise<PublicBrandingSettings> {
  try {
    const settings = await getAppSettings();
    return toPublicBranding(settings);
  } catch (error) {
    console.error("[PlacementIQ] Branding settings unavailable, using defaults:", error);
    return getDefaultPublicBrandingSettings();
  }
}

export async function updateAppSettings(
  input: UpdateAppSettingsInput,
  updatedByUserId: string
): Promise<AppSettingsRecord> {
  await ensureAppSettings();

  const data: Record<string, unknown> = { updatedByUserId };

  if (input.institutionName !== undefined) {
    data.institutionName = input.institutionName.trim() || DEFAULT_INSTITUTION_NAME;
  }
  if (input.placementCellName !== undefined) {
    data.placementCellName =
      input.placementCellName.trim() || DEFAULT_PLACEMENT_CELL_NAME;
  }
  if (input.reportHeaderText !== undefined) {
    data.reportHeaderText = input.reportHeaderText?.trim() || null;
  }
  if (input.reportFooterText !== undefined) {
    data.reportFooterText = input.reportFooterText?.trim() || null;
  }
  if (input.contactEmail !== undefined) {
    data.contactEmail = input.contactEmail?.trim() || null;
  }
  if (input.contactPhone !== undefined) {
    data.contactPhone = input.contactPhone?.trim() || null;
  }
  if (input.website !== undefined) {
    data.website = input.website?.trim() || null;
  }
  if (input.address !== undefined) {
    data.address = input.address?.trim() || null;
  }
  if (input.defaultAcademicYear !== undefined) {
    data.defaultAcademicYear = input.defaultAcademicYear?.trim() || null;
  }
  if (input.primaryColor !== undefined) {
    const color = input.primaryColor?.trim() || null;
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      throw new Error("Primary color must be a valid hex code (e.g. #4f46e5).");
    }
    data.primaryColor = color;
  }
  if (input.reportSignatureName !== undefined) {
    data.reportSignatureName = input.reportSignatureName?.trim() || null;
  }
  if (input.reportSignatureDesignation !== undefined) {
    data.reportSignatureDesignation =
      input.reportSignatureDesignation?.trim() || null;
  }

  const row = await prisma.appSettings.update({
    where: { id: SETTINGS_ID },
    data,
  });

  return mapRecord(row);
}

export async function setInstitutionLogoPath(
  logoPath: string | null,
  updatedByUserId: string
): Promise<AppSettingsRecord> {
  await ensureAppSettings();
  const row = await prisma.appSettings.update({
    where: { id: SETTINGS_ID },
    data: { institutionLogoPath: logoPath, updatedByUserId },
  });
  return mapRecord(row);
}

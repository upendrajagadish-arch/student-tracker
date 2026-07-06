export interface AppSettingsRecord {
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
  createdAt: string;
  updatedAt: string;
}

export interface PublicBrandingSettings {
  institutionName: string;
  placementCellName: string;
  productName: string;
  tagline: string;
  logoUrl: string | null;
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
}

export interface UpdateAppSettingsInput {
  institutionName?: string;
  placementCellName?: string;
  reportHeaderText?: string | null;
  reportFooterText?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  address?: string | null;
  defaultAcademicYear?: string | null;
  primaryColor?: string | null;
  reportSignatureName?: string | null;
  reportSignatureDesignation?: string | null;
}

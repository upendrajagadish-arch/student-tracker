/**
 * User-friendly API error messages for PlacementIQ.
 */

export function unauthorizedMessage(role?: string): string {
  if (role === "HR") {
    return "You do not have access to this area. Use HR Talent Room for shared candidates.";
  }
  if (role === "FACULTY") {
    return "This action is restricted to TPO or Admin staff.";
  }
  return "You are not signed in or do not have permission for this action.";
}

export function importErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "We could not read your import file. Check the format and try again.";
  }
  const msg = error.message.toLowerCase();
  if (msg.includes("column") || msg.includes("header")) {
    return "Import file is missing required columns. Download the sample CSV and match its headers.";
  }
  if (msg.includes("xlsx") || msg.includes("excel")) {
    return "Could not parse the Excel file. Save as .xlsx or use CSV format.";
  }
  return error.message;
}

export function resumeUploadErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Resume upload failed. Please try again or contact your TPO.";
  }
  const msg = error.message.toLowerCase();
  if (msg.includes("enoent") || msg.includes("storage")) {
    return "Could not save the file on the server. Check upload folder permissions.";
  }
  return error.message;
}

export function matchingErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Matching could not complete. Ensure the requirement is active and try again.";
  }
  const msg = error.message.toLowerCase();
  if (msg.includes("inactive")) {
    return "This requirement is inactive. Activate it before running matching.";
  }
  return error.message;
}

export function analyticsExportErrorMessage(status: number): string {
  if (status === 401) {
    return "Analytics export is available to Admin and TPO only.";
  }
  if (status === 500) {
    return "Export failed while generating the workbook. Try again in a moment.";
  }
  return "Could not export analytics. Please try again.";
}

export function passportAccessDeniedMessage(context: "internal" | "hr"): string {
  if (context === "hr") {
    return "Placement Passport is not available for this share. Ask the TPO to enable passport access.";
  }
  return "You do not have permission to view this placement passport.";
}

/** Parse API error body — supports legacy `{ error: string }` and standard `{ error: { message } }`. */
export function parseApiErrorMessage(
  body: unknown,
  fallback = "Request failed"
): string {
  if (!body || typeof body !== "object") return fallback;
  const record = body as Record<string, unknown>;
  if (
    record.error &&
    typeof record.error === "object" &&
    record.error !== null &&
    "message" in record.error
  ) {
    return String((record.error as { message: unknown }).message);
  }
  if (typeof record.error === "string") return record.error;
  return fallback;
}

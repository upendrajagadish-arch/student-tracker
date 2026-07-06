export const RESUME_TEXT_AI_LIMIT = 12_000;
export const RESUME_TEXT_PREVIEW_LIMIT = 500;

export class ResumeTextExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumeTextExtractionError";
  }
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function resumeTextPreview(text: string): string {
  return text.trim().slice(0, RESUME_TEXT_PREVIEW_LIMIT);
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return normalizeWhitespace(result.text ?? "");
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return normalizeWhitespace(result.value ?? "");
}

export async function extractResumeText(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<{ text: string; truncated: boolean }> {
  const lower = fileName.toLowerCase();
  let text = "";

  try {
    if (
      mimeType === "application/pdf" ||
      lower.endsWith(".pdf")
    ) {
      text = await extractPdfText(buffer);
    } else if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      lower.endsWith(".docx")
    ) {
      text = await extractDocxText(buffer);
    } else {
      throw new ResumeTextExtractionError(
        "Unsupported resume format. Only PDF and DOCX can be analyzed."
      );
    }
  } catch (error) {
    if (error instanceof ResumeTextExtractionError) throw error;
    throw new ResumeTextExtractionError(
      "Could not read text from this resume file. Try re-uploading as PDF or DOCX."
    );
  }

  if (!text || text.length < 20) {
    throw new ResumeTextExtractionError(
      "Very little text was found in this resume. It may be image-based or empty."
    );
  }

  const truncated = text.length > RESUME_TEXT_AI_LIMIT;
  return {
    text: truncated ? text.slice(0, RESUME_TEXT_AI_LIMIT) : text,
    truncated,
  };
}

export function textForAiPrompt(text: string, truncated: boolean): string {
  if (!truncated) return text;
  return `${text}\n\n[Text truncated for analysis]`;
}

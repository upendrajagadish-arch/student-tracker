export type AiProviderName = "none" | "openai";

export interface AiConfig {
  provider: AiProviderName;
  model: string;
  isEnabled: boolean;
}

const DEFAULT_MODEL = "gpt-4o-mini";

/** Server-only AI configuration — never import from client components. */
export function getAiConfig(): AiConfig {
  const rawProvider = (process.env.AI_PROVIDER ?? "none").toLowerCase();
  const provider: AiProviderName =
    rawProvider === "openai" ? "openai" : "none";
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.AI_MODEL?.trim() || DEFAULT_MODEL;

  return {
    provider,
    model,
    isEnabled: provider === "openai" && Boolean(apiKey),
  };
}

export class AiProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiProviderError";
  }
}

/**
 * Request structured JSON from OpenAI. Returns raw JSON string for Zod validation.
 */
export async function completeJsonWithOpenAi(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const config = getAiConfig();
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!config.isEnabled || !apiKey) {
    throw new AiProviderError("OpenAI is not configured.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new AiProviderError(
      `AI request failed (${response.status}). ${body.slice(0, 120)}`
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new AiProviderError("AI returned an empty response.");
  }

  return content;
}

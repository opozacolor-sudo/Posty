import Anthropic from "@anthropic-ai/sdk";
import {
  getAnthropicApiKey,
  getAnthropicModelCandidates,
} from "./anthropic-env";

type ClaudeMessage = {
  role: "user" | "assistant";
  content: string;
};

function extractErrorMessage(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    return `${error.status} ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function isRetryableModelError(error: unknown): boolean {
  if (!(error instanceof Anthropic.APIError)) {
    return false;
  }

  return error.status === 404 || error.status === 400;
}

export async function createClaudeReply(options: {
  system: string;
  messages: ClaudeMessage[];
  maxTokens?: number;
}): Promise<{ text: string; model: string }> {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    throw new Error("ANTHROPIC_NOT_CONFIGURED");
  }

  const anthropic = new Anthropic({ apiKey });
  const models = getAnthropicModelCandidates();
  let lastError: unknown;

  for (const model of models) {
    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: options.maxTokens ?? 1024,
        system: options.system,
        messages: options.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      });

      const text =
        response.content[0]?.type === "text" ? response.content[0].text.trim() : "";

      if (!text) {
        throw new Error("Claude returned an empty response");
      }

      return { text, model };
    } catch (error) {
      lastError = error;
      console.warn(`[posty/claude] Model ${model} failed:`, extractErrorMessage(error));

      if (!isRetryableModelError(error)) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("All Claude models failed");
}

export async function pingClaude(): Promise<{
  ok: boolean;
  model?: string;
  error?: string;
}> {
  try {
    const result = await createClaudeReply({
      system: "Reply with exactly: ok",
      messages: [{ role: "user", content: "ping" }],
      maxTokens: 16,
    });
    return { ok: true, model: result.model };
  } catch (error) {
    return { ok: false, error: extractErrorMessage(error) };
  }
}

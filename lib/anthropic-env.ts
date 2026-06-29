export type AnthropicEnvDebug = {
  configured: boolean;
  model: string;
  missing: string[];
};

const DEFAULT_MODEL = "claude-sonnet-4-6";

/** Current Claude API IDs — see https://platform.claude.com/docs/en/about-claude/models/overview */
const FALLBACK_MODELS = [
  "claude-sonnet-4-6",
  "claude-sonnet-4-5",
  "claude-haiku-4-5",
  "claude-haiku-4-5-20251001",
] as const;

export function getAnthropicApiKey(): string | null {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey || apiKey.includes("your_anthropic")) {
    return null;
  }
  return apiKey;
}

export function isAnthropicConfigured(): boolean {
  return getAnthropicApiKey() !== null;
}

const DEPRECATED_MODELS = new Set([
  "claude-sonnet-4-20250514",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
  "claude-3-5-sonnet-latest",
  "claude-3-5-haiku-latest",
]);

export function getAnthropicModel(): string {
  const envModel = process.env.ANTHROPIC_MODEL?.trim();
  if (envModel && !DEPRECATED_MODELS.has(envModel)) {
    return envModel;
  }
  return DEFAULT_MODEL;
}

export function getAnthropicModelCandidates(): string[] {
  const preferred = getAnthropicModel();
  const candidates = [preferred, ...FALLBACK_MODELS.filter((m) => m !== preferred)];
  return [...new Set(candidates)];
}

export function getAnthropicEnvDebug(): AnthropicEnvDebug {
  const missing: string[] = [];
  if (!getAnthropicApiKey()) {
    missing.push("ANTHROPIC_API_KEY");
  }

  return {
    configured: missing.length === 0,
    model: getAnthropicModel(),
    missing,
  };
}

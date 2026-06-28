import { locales, type Locale } from "@/i18n/routing";

export const VOICE_TONES = [
  "professional",
  "casual",
  "funny",
  "inspirational",
  "educational",
] as const;

export type VoiceTone = (typeof VOICE_TONES)[number];

export type BrandProfile = {
  niche: string;
  voice_tone: VoiceTone;
  target_audience: string;
  ai_content_language: string;
  favorite_hashtags: string[];
  claude_note: string;
};

export const EMPTY_BRAND_PROFILE: BrandProfile = {
  niche: "",
  voice_tone: "professional",
  target_audience: "",
  ai_content_language: "en",
  favorite_hashtags: [],
  claude_note: "",
};

export function parseBrandProfile(data: unknown): BrandProfile {
  if (!data || typeof data !== "object") {
    return { ...EMPTY_BRAND_PROFILE };
  }

  const record = data as Record<string, unknown>;
  const voiceTone = record.voice_tone;
  const language = record.ai_content_language;

  return {
    niche: typeof record.niche === "string" ? record.niche : "",
    voice_tone: VOICE_TONES.includes(voiceTone as VoiceTone)
      ? (voiceTone as VoiceTone)
      : "professional",
    target_audience:
      typeof record.target_audience === "string" ? record.target_audience : "",
    ai_content_language:
      typeof language === "string" &&
      locales.includes(language as Locale)
        ? language
        : "en",
    favorite_hashtags: Array.isArray(record.favorite_hashtags)
      ? record.favorite_hashtags.filter(
          (tag): tag is string => typeof tag === "string",
        )
      : [],
    claude_note:
      typeof record.claude_note === "string" ? record.claude_note : "",
  };
}

export function normalizeHashtag(raw: string): string {
  const trimmed = raw.trim().replace(/^#+/, "");
  return trimmed ? `#${trimmed}` : "";
}

export function buildClaudeBrandContext(profile: BrandProfile): string {
  const lines: string[] = [];

  if (profile.niche.trim()) {
    lines.push(`Brand / niche: ${profile.niche.trim()}`);
  }
  if (profile.voice_tone) {
    lines.push(`Voice tone: ${profile.voice_tone}`);
  }
  if (profile.target_audience.trim()) {
    lines.push(`Target audience: ${profile.target_audience.trim()}`);
  }
  if (profile.ai_content_language) {
    lines.push(
      `Preferred language for generated content: ${profile.ai_content_language}`,
    );
  }
  if (profile.favorite_hashtags.length > 0) {
    lines.push(
      `Favorite hashtags: ${profile.favorite_hashtags.join(", ")}`,
    );
  }
  if (profile.claude_note.trim()) {
    lines.push(`Additional notes: ${profile.claude_note.trim()}`);
  }

  return lines.join("\n");
}

import { createClaudeReply, type ClaudeMessage } from "./anthropic-client";
import type { BrandProfile } from "./brand-profile";
import type { ChatAttachment } from "./chat-upload";
import {
  messageWantsPublishAction,
  messageWantsScheduleAction,
  userRequestsCaption,
} from "./chat-intent-triggers";
import { findLatestPublishMedia } from "./schedule-intent";

export type CaptionStyle = "normal" | "genz";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
};

const GENZ_STYLE_PATTERN =
  /\b(?:gen[\s-]?z|genz|tineri|youth|slang|provocat(?:iv|or)?|curaj|îndr[aă]zne[sș]te|indrazneste|vibe|hook|scurt[aă]?|punchy|bold| edgy)\b/i;

/**
 * Short style-only instructions like "descriere genz" — not literal caption text.
 */
const CAPTION_INSTRUCTION_PATTERN =
  /\b(gen\s?z|genz|amuzant[aă]?|funny|haio[sș]?|profesional[aă]?|professional|captivant[aă]?|catchy|cool|creativ[aă]?|scrie(?:-mi|-o|-i)?\s*tu|genereaz[aă]|creaz[aă]|write\s+(?:a|the|me)\s+caption|generate\s+(?:a|the)\s+caption|ai\s+(?:o\s+)?descriere|make\s+it\s+(?:sound|catchy|funny)|hook|virald?[aă]?)\b/i;

const LOCALE_LANGUAGE: Record<string, string> = {
  ro: "Romanian",
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ru: "Russian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ar: "Arabic",
  hi: "Hindi",
};

export function looksLikeCaptionInstruction(text: string | null | undefined): boolean {
  if (!text) {
    return false;
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }

  const wordCount = trimmed.split(/\s+/).length;
  return wordCount <= 14 && CAPTION_INSTRUCTION_PATTERN.test(trimmed);
}

export function detectCaptionStyle(
  text: string,
  brandProfile?: BrandProfile,
): CaptionStyle {
  if (GENZ_STYLE_PATTERN.test(text)) {
    return "genz";
  }

  const tone = brandProfile?.voice_tone;
  if (tone === "funny" || tone === "casual") {
    return "genz";
  }

  return "normal";
}

export function shouldAutoGenerateCaption(
  lastUserMessage: string,
  messages: ChatMessage[],
): boolean {
  const media = findLatestPublishMedia(messages);
  if (!media) {
    return false;
  }

  const wantsAction =
    messageWantsPublishAction(lastUserMessage) ||
    messageWantsScheduleAction(lastUserMessage);

  if (!wantsAction) {
    return false;
  }

  return userRequestsCaption(lastUserMessage) || wantsAction;
}

function buildCaptionSystemPrompt(options: {
  locale: string;
  style: CaptionStyle;
  brandContext?: string;
  platformHint?: string;
}): string {
  const language = LOCALE_LANGUAGE[options.locale] ?? "English";
  const styleGuide =
    options.style === "genz"
      ? [
          "Style: Gen-Z / social-native — very short, punchy, conversational.",
          "Use hooks like questions or bold one-liners (e.g. \"Ai curaj să porți asta? Îndrăznește.\").",
          "1-2 short sentences max. Optional 2-4 hashtags at the end.",
          "No corporate tone. No filler. No emojis overload (0-2 max).",
        ].join("\n")
      : [
          "Style: Normal Instagram/social caption — friendly, clear, on-brand.",
          "1-3 short sentences. Add 3-6 relevant hashtags at the end.",
          "Sound human, not robotic.",
        ].join("\n");

  return [
    "You write social media captions for Posty. Reply with ONLY the caption text — no quotes, no labels, no questions back to the user.",
    `Language: ${language}.`,
    styleGuide,
    options.platformHint ? `Platform: ${options.platformHint}.` : "",
    options.brandContext?.trim()
      ? `\nBrand context:\n${options.brandContext.trim()}`
      : "",
    "",
    "Rules:",
    "- Look at the attached image if present.",
    "- Never ask clarifying questions.",
    "- Never say \"Here is your caption\" — output the caption directly.",
    "- Do not mention Posty or that you are an AI.",
  ]
    .filter(Boolean)
    .join("\n");
}

function detectPlatformHint(text: string): string | undefined {
  if (/\b(?:instagram|insta|\big\b)\b/i.test(text)) return "Instagram";
  if (/\btiktok\b/i.test(text)) return "TikTok";
  if (/\b(?:youtube|\byt\b)\b/i.test(text)) return "YouTube";
  if (/\b(?:facebook|\bfb\b)\b/i.test(text)) return "Facebook";
  if (/\blinkedin\b/i.test(text)) return "LinkedIn";
  if (/\bthreads\b/i.test(text)) return "Threads";
  return undefined;
}

function findCaptionSourceMessage(messages: ChatMessage[]): ClaudeMessage | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") {
      continue;
    }

    if (message.attachments?.length || message.content.trim()) {
      return {
        role: "user",
        content: message.content.trim() || "Scrie un caption pentru atașament.",
        attachments: message.attachments,
      };
    }
  }

  return null;
}

export async function generateCaptionForMedia(options: {
  messages: ChatMessage[];
  locale: string;
  brandContext?: string;
  brandProfile?: BrandProfile;
  userHint?: string;
  instruction?: string;
}): Promise<string | null> {
  const sourceMessage = findCaptionSourceMessage(options.messages);
  if (!sourceMessage) {
    return null;
  }

  const hint =
    options.instruction?.trim() ||
    options.userHint ||
    ([...options.messages]
      .reverse()
      .find((message) => message.role === "user")
      ?.content ??
      "");

  const style = detectCaptionStyle(hint, options.brandProfile);
  const platformHint = detectPlatformHint(hint);

  const system = buildCaptionSystemPrompt({
    locale: options.locale,
    style,
    brandContext: options.brandContext,
    platformHint,
  });

  try {
    const { text } = await createClaudeReply({
      system,
      messages: [sourceMessage],
      maxTokens: 256,
    });

    const caption = text
      .replace(/^["'„""]+|["'""]+$/g, "")
      .trim();

    return caption || null;
  } catch (error) {
    console.error(
      "[posty/caption] Generation failed:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

export async function resolveCaptionIfInstruction(options: {
  caption: string;
  messages: ChatMessage[];
  locale: string;
  brandContext?: string;
  brandProfile?: BrandProfile;
  userHint?: string;
}): Promise<string> {
  if (!looksLikeCaptionInstruction(options.caption)) {
    return options.caption;
  }

  const generated = await generateCaptionForMedia({
    messages: options.messages,
    locale: options.locale,
    brandContext: options.brandContext,
    brandProfile: options.brandProfile,
    userHint: options.userHint,
    instruction: options.caption,
  });

  return generated?.trim() || options.caption;
}

import { createClaudeReply } from "./anthropic-client";
import type { ConnectedAccount } from "./dashboard-data";
import { PLATFORMS, type SocialPlatform } from "./dashboard-data";
import type { ChatAttachment } from "./chat-upload";
import type { CreateScheduledPostInput } from "./scheduled-posts";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
};

type ScheduleExtraction = {
  shouldSchedule: boolean;
  platform?: SocialPlatform;
  title?: string;
  caption?: string;
  scheduledAt?: string;
  mediaUrl?: string | null;
  reason?: string;
};

const SCHEDULE_KEYWORDS =
  /\b(programeaz|program(ez|are|at|ezi)|schedule|planific|plan(eaz|ez)|confirm(a|ă)\s+(program|schedule)|da,?\s*programeaz|post(eaz|ez)?\s+(pe|on|for|la)\s+|set\s+up\s+(the\s+)?post)\b/i;

function isSocialPlatform(value: string): value is SocialPlatform {
  return PLATFORMS.includes(value as SocialPlatform);
}

export function userMentionsScheduling(message: string): boolean {
  return SCHEDULE_KEYWORDS.test(message);
}

function formatHistoryForExtraction(messages: ChatMessage[]): string {
  return messages
    .map((message) => {
      const attachmentNote = message.attachments?.length
        ? ` [attachments: ${message.attachments.map((item) => `${item.name} (${item.url})`).join(", ")}]`
        : "";
      return `${message.role.toUpperCase()}: ${message.content}${attachmentNote}`;
    })
    .join("\n\n");
}

function findLatestMediaUrl(messages: ChatMessage[]): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const attachment = message.attachments?.find((item) =>
      item.mediaType.startsWith("image/"),
    );
    if (attachment?.url) {
      return attachment.url;
    }

    const generatedMatch = message.content.match(
      /\[Posty generated image: (https?:\/\/[^\]]+)\]/i,
    );
    if (generatedMatch?.[1]) {
      return generatedMatch[1];
    }
  }

  return null;
}

function parseExtractionJson(text: string): ScheduleExtraction | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as ScheduleExtraction;
    return parsed;
  } catch {
    return null;
  }
}

export async function extractScheduleFromConversation(options: {
  messages: ChatMessage[];
  connectedAccounts: ConnectedAccount[];
  locale: string;
}): Promise<CreateScheduledPostInput | null> {
  const { messages, connectedAccounts, locale } = options;
  const lastUserMessage =
    [...messages].reverse().find((message) => message.role === "user")?.content ??
    "";

  if (!userMentionsScheduling(lastUserMessage)) {
    return null;
  }

  const connectedPlatforms = connectedAccounts
    .filter((account) => account.connected)
    .map((account) => account.platform);

  const now = new Date();
  const timezone = locale === "ro" ? "Europe/Bucharest" : "UTC";

  const system = [
    "You extract scheduling details from a Posty chat conversation.",
    "Reply with ONLY valid JSON, no markdown.",
    "",
    `Current date/time: ${now.toISOString()} (${timezone} reference for relative dates like "tomorrow" or "mâine").`,
    `Connected platforms: ${connectedPlatforms.length > 0 ? connectedPlatforms.join(", ") : "none"}.`,
    "",
    "JSON schema:",
    '{ "shouldSchedule": boolean, "platform": "instagram"|"tiktok"|..., "title": "short preview max 80 chars", "caption": "full post text", "scheduledAt": "ISO 8601 with timezone offset", "mediaUrl": string|null, "reason": "why not scheduling if shouldSchedule is false" }',
    "",
    "Rules:",
    "- Set shouldSchedule true ONLY when the user clearly wants to save/schedule a post AND platform, caption, and future datetime are known.",
    "- Use a connected platform when possible; if user picks a disconnected platform, set shouldSchedule false.",
    "- title = short preview of caption (first line or hook).",
    "- scheduledAt must be in the future.",
    "- Prefer the latest uploaded/generated image URL for mediaUrl when relevant.",
    "- Relative times: interpret in user's local context (Romania = EET/EEST).",
    '- Confirmation messages like "da, programează" count if prior messages contain caption/platform/time.',
  ].join("\n");

  const { text } = await createClaudeReply({
    system,
    messages: [
      {
        role: "user",
        content: formatHistoryForExtraction(messages),
      },
    ],
    maxTokens: 512,
  });

  const extraction = parseExtractionJson(text);
  if (!extraction?.shouldSchedule) {
    return null;
  }

  if (
    !extraction.platform ||
    !isSocialPlatform(extraction.platform) ||
    !extraction.caption?.trim() ||
    !extraction.scheduledAt
  ) {
    return null;
  }

  if (!connectedPlatforms.includes(extraction.platform)) {
    return null;
  }

  const scheduledAt = new Date(extraction.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
    return null;
  }

  const mediaUrl =
    extraction.mediaUrl?.trim() ||
    findLatestMediaUrl(messages) ||
    null;

  return {
    platform: extraction.platform,
    title:
      extraction.title?.trim() ||
      extraction.caption.trim().slice(0, 80),
    caption: extraction.caption.trim(),
    scheduledAt: scheduledAt.toISOString(),
    mediaUrl,
  };
}

export function formatScheduleConfirmation(
  input: CreateScheduledPostInput,
  locale: string,
): string {
  const formatter = new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const when = formatter.format(new Date(input.scheduledAt));

  if (locale === "ro") {
    return `Postarea a fost salvată în calendar pentru ${input.platform} pe ${when}. O vei vedea la „Postări următoare”. Publicarea efectivă pe platformă vine în curând.`;
  }

  return `Post saved to your calendar for ${input.platform} on ${when}. You'll see it under Upcoming posts. Actual publishing to the platform is coming soon.`;
}

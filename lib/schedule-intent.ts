import { createClaudeReply } from "./anthropic-client";
import type { ConnectedAccount } from "./dashboard-data";
import { PLATFORMS, type SocialPlatform } from "./dashboard-data";
import type { ChatAttachment } from "./chat-upload";
import type { CreateScheduledPostInput } from "./scheduled-posts";
import { formatScheduleDateTime } from "./schedule-display";

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
  /\b(programeaz|program(ez|are|at|ezi)|schedule|planific|plan(eaz|ez)|confirm(a|ă)\s+(program|schedule)|da,?\s*programeaz|post(eaz|ez)?\s+(pe|on|for|la)\s+|set\s+up\s+(the\s+)?post|salveaz[aă]\s+(post|în calendar))\b/i;

const CONFIRM_ONLY =
  /^(da|yes|yep|ok|okay|confirm[aă]?|sigur|perfect|mergi|save|salveaz[aă])[\s!.?,]*$/i;

function isSocialPlatform(value: string): value is SocialPlatform {
  return PLATFORMS.includes(value as SocialPlatform);
}

export function userMentionsScheduling(message: string): boolean {
  return SCHEDULE_KEYWORDS.test(message);
}

export function userConfirmsScheduling(message: string): boolean {
  const trimmed = message.trim();
  return (
    CONFIRM_ONLY.test(trimmed) ||
    /\b(da,?\s*(programeaz|salveaz|confirm)|yes,?\s*(schedule|save|confirm))\b/i.test(
      trimmed,
    )
  );
}

function conversationHasPendingSchedule(messages: ChatMessage[]): boolean {
  if (
    messages.some(
      (message) =>
        message.role === "user" && userMentionsScheduling(message.content),
    )
  ) {
    return true;
  }

  const recentAssistant = [...messages]
    .reverse()
    .filter((message) => message.role === "assistant")
    .slice(0, 2);

  return recentAssistant.some((message) => {
    const text = message.content;
    const lower = text.toLowerCase();

    return (
      (/\b(instagram|tiktok|youtube|facebook|linkedin|threads|pinterest)\b/i.test(
        text,
      ) &&
        (/\b(mâine|tomorrow|azi|today|\d{1,2}:\d{2}|18:00|calendar|program)\b/i.test(
          lower,
        ) ||
          /platform[aă]?:|caption:|data\/ora:|summary for post/i.test(text))) ||
      /salvez postarea|save (it )?to (the )?calendar|spune ['"]da['"]/i.test(
        text,
      )
    );
  });
}

export function shouldAttemptScheduleExtraction(
  lastUserMessage: string,
  messages: ChatMessage[],
): boolean {
  if (/\b(post(eaz|ez)?\s+acum|post\s+now|publish\s+now|public[aă]\s+acum)\b/i.test(lastUserMessage)) {
    return false;
  }

  if (userMentionsScheduling(lastUserMessage)) {
    return true;
  }

  if (
    userConfirmsScheduling(lastUserMessage) &&
    conversationHasPendingSchedule(messages)
  ) {
    return true;
  }

  return false;
}

function getDateInTimeZone(timeZone: string, dayOffset = 0): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const target = new Date(Date.UTC(year, month - 1, day + dayOffset));

  return target.toISOString().slice(0, 10);
}

function buildScheduledAtISO(
  dayOffset: number,
  hour: number,
  minute: number,
  locale: string,
): string | null {
  const timeZone = locale === "ro" ? "Europe/Bucharest" : "UTC";
  const offset = locale === "ro" ? "+03:00" : "Z";
  const dateStr = getDateInTimeZone(timeZone, dayOffset);
  const iso = `${dateStr}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00${offset}`;
  const date = new Date(iso);

  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
    return null;
  }

  return date.toISOString();
}

function detectPlatform(
  text: string,
  connectedPlatforms: SocialPlatform[],
): SocialPlatform | null {
  const patterns: Array<[SocialPlatform, RegExp]> = [
    ["instagram", /\b(instagram|insta|\big\b)\b/i],
    ["tiktok", /\btiktok\b/i],
    ["youtube", /\b(youtube|\byt\b)\b/i],
    ["facebook", /\bfacebook\b/i],
    ["linkedin", /\blinkedin\b/i],
    ["threads", /\bthreads\b/i],
    ["pinterest", /\bpinterest\b/i],
    ["x", /\b(\bx\b|twitter)\b/i],
    ["bluesky", /\bbluesky\b/i],
  ];

  for (const [platform, pattern] of patterns) {
    if (connectedPlatforms.includes(platform) && pattern.test(text)) {
      return platform;
    }
  }

  return null;
}

export function extractCaption(messages: ChatMessage[]): string | null {
  for (const message of messages) {
    if (message.role !== "user") {
      continue;
    }

    const inlineCaption = message.content.match(
      /\b(?:cu textul|with (?:the )?(?:text|caption)|captionul)[:\s]+([\s\S]+)$/i,
    );

    if (inlineCaption?.[1]?.trim()) {
      return inlineCaption[1].trim();
    }
  }

  const userText = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n");

  const quotedCaption =
    userText.match(/[„""']([^""'”]+)[""'”]/) ??
    userText.match(/:\s*[„""']([^""'”]+)[""'”]/);

  if (quotedCaption?.[1]?.trim()) {
    return quotedCaption[1].trim();
  }

  for (const message of [...messages].reverse()) {
    if (message.role !== "assistant") {
      continue;
    }

    const blockquoteCaption = message.content.match(
      /^>\s*\*?[„""']?(.+?)[""'”]?\*?\s*$/m,
    );
    if (blockquoteCaption?.[1]?.trim()) {
      return blockquoteCaption[1].trim();
    }

    const labeledCaption =
      message.content.match(/\*\*Caption:\*\*\s*(.+)/i) ??
      message.content.match(/(?:^|\n)\*?\*?Caption:\*?\*?\s*(.+)/i);

    if (labeledCaption?.[1]?.trim()) {
      return labeledCaption[1].trim();
    }

    if (/variant[aă]\s*1|op[tț]iunea?\s*1|option\s*1/i.test(userText)) {
      const optionOne =
        message.content.match(
          /\*\*Op[tț]iunea?\s*1[^*]*\*\*\s*\n([\s\S]+?)(?:\n\n|\*\*|$)/i,
        ) ??
        message.content.match(/Op[tț]iunea?\s*1[^:\n]*:?\s*["„]?([^\n"]+)/i);

      if (optionOne?.[1]?.trim()) {
        return optionOne[1].trim();
      }
    }

    const hashtagLine = message.content.match(
      /(.{8,}?#\w[\w\d]*(?:\s+#\w[\w\d]*)*)/,
    );

    if (hashtagLine?.[1]?.trim() && !/hashtag/i.test(hashtagLine[1])) {
      return hashtagLine[1].trim();
    }
  }

  return null;
}

function parseScheduleTimeFromText(
  text: string,
  locale: string,
): string | null {
  let dayOffset: number | null = null;

  if (/\b(mâine|maine|tomorrow)\b/i.test(text)) {
    dayOffset = 1;
  } else if (/\b(azi|today)\b/i.test(text)) {
    dayOffset = 0;
  }

  if (dayOffset === null) {
    return null;
  }

  const timeMatch = text.match(/\b(\d{1,2})[:h.](\d{2})\b/);
  const hour = timeMatch ? Number(timeMatch[1]) : 18;
  const minute = timeMatch ? Number(timeMatch[2]) : 0;

  return buildScheduledAtISO(dayOffset, hour, minute, locale);
}

export function parseScheduleHeuristic(options: {
  messages: ChatMessage[];
  connectedAccounts: ConnectedAccount[];
  locale: string;
}): CreateScheduledPostInput | null {
  const { messages, connectedAccounts, locale } = options;
  const connectedPlatforms = connectedAccounts
    .filter((account) => account.connected)
    .map((account) => account.platform);
  const allText = messages.map((message) => message.content).join("\n");
  const platform = detectPlatform(allText, connectedPlatforms);
  const caption = extractCaption(messages);
  const scheduledAt = parseScheduleTimeFromText(allText, locale);

  if (!platform || !caption || !scheduledAt) {
    return null;
  }

  return {
    platform,
    title: caption.slice(0, 80),
    caption,
    scheduledAt,
    mediaUrl: findLatestPublishMedia(messages)?.url ?? findLatestMediaUrl(messages),
  };
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

export function findLatestMediaUrl(messages: ChatMessage[]): string | null {
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

export function findLatestVideoUrl(messages: ChatMessage[]): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const attachment = message.attachments?.find((item) =>
      item.mediaType.startsWith("video/"),
    );
    if (attachment?.url) {
      return attachment.url;
    }
  }

  return null;
}

export type PublishMedia = {
  url: string;
  mediaType: "image" | "video";
  contentType: string;
};

export function findLatestPublishMedia(messages: ChatMessage[]): PublishMedia | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message.attachments?.length) {
      continue;
    }

    const video = message.attachments.find((item) =>
      item.mediaType.startsWith("video/"),
    );
    if (video?.url) {
      return {
        url: video.url,
        mediaType: "video",
        contentType: video.mediaType,
      };
    }

    const image = message.attachments.find((item) =>
      item.mediaType.startsWith("image/"),
    );
    if (image?.url) {
      return {
        url: image.url,
        mediaType: "image",
        contentType: image.mediaType,
      };
    }
  }

  const generatedMatch = [...messages]
    .reverse()
    .map((message) =>
      message.content.match(/\[Posty generated image: (https?:\/\/[^\]]+)\]/i),
    )
    .find(Boolean);

  if (generatedMatch?.[1]) {
    return {
      url: generatedMatch[1],
      mediaType: "image",
      contentType: "image/jpeg",
    };
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

  if (!shouldAttemptScheduleExtraction(lastUserMessage, messages)) {
    return null;
  }

  const connectedPlatforms = connectedAccounts
    .filter((account) => account.connected)
    .map((account) => account.platform);

  const heuristic = parseScheduleHeuristic(options);
  if (heuristic) {
    return heuristic;
  }

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
    "- Set shouldSchedule true when the user wants to save/schedule AND platform, caption, and future datetime are known (from any message in the thread).",
    "- If the user says \"cu captionul tău\" / \"with your caption\", use the caption Claude drafted in an earlier assistant message.",
    "- Short confirmations (\"da\", \"yes\", \"ok\") after a schedule summary mean shouldSchedule true — reuse platform, caption, and time from the conversation.",
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
    findLatestPublishMedia(messages)?.url ||
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
  const when = formatScheduleDateTime(input.scheduledAt, locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  if (locale === "ro") {
    return `Postarea a fost salvată în calendar pentru ${input.platform} pe ${when}. O vei vedea la „Postări următoare”. Poți publica acum din chat cu „postează acum”.`;
  }

  return `Post saved to your calendar for ${input.platform} on ${when}. You'll see it under Upcoming posts. Say "post now" in chat to publish immediately.`;
}

import type { ConnectedAccount } from "./dashboard-data";
import { PLATFORMS, type SocialPlatform } from "./dashboard-data";
import type { ChatAttachment } from "./chat-upload";
import type { PublishInput } from "./publish";
import {
  extractCaption,
  findLatestPublishMedia,
  userConfirmsScheduling,
} from "./schedule-intent";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
};

const POST_NOW_VERB =
  /\b(?:posteaz[aă]?|postez|post)\s+acum\b|\b(?:publish|post)\s+now\b|\bpublic[aă]\s+acum\b|\btrimite\s+acum\b/i;

const PUBLISH_KEYWORDS =
  /\b(?:posteaz[aă]?\s+poza|poza anterioar[aă]|posteaz[aă]\s+pe\s+toate|pe\s+toate\s+(re[tț]elele|platformele|conturile)|toate\s+(re[tț]elele|platformele|conturile)|all\s+(connected|networks|platforms)|post\s+to\s+all)\b/i;

const PLATFORM_PUBLISH_PATTERN =
  /\b(?:posteaz[aă]?|postez|post|public[aă]|trimite)\s+(?:acum\s+)?(?:pe\s+)?(?:video(?:ul)?\s+(?:pe\s+)?)?(instagram|insta|\big\b|facebook|linkedin|threads|pinterest|tiktok|youtube)\b/i;

const PUBLISH_RETRY_PATTERN =
  /\b(ai postat|s-a postat|a mers|re[iî]ncearc[aă]|(?:mai\s+)?(?:o\s+dat[aă]|din nou)|retry|post again|did it post)\b/i;

function conversationReadyToPublish(messages: ChatMessage[]): boolean {
  return Boolean(extractCaption(messages) && findLatestPublishMedia(messages));
}

function lastAssistantPublishWasInconclusive(messages: ChatMessage[]): boolean {
  const recentAssistant = [...messages]
    .reverse()
    .filter((message) => message.role === "assistant")
    .slice(0, 2);

  if (recentAssistant.length === 0) {
    return false;
  }

  return recentAssistant.some((message) => {
    const content = message.content;
    if (content.includes("---") && /Publicare finalizată|Publishing finished/i.test(content)) {
      return false;
    }

    return /Se postează acum|Se publică|Revin imediat|nu am primit|waiting for confirmation|aștept confirmarea/i.test(
      content,
    );
  });
}

const PUBLISH_CONFIRM_NOW =
  /^(acum|now)[\s!.?,]*$|^\s*(da|yes|ok|okay|sigur|perfect)[,!.?\s]*(acum|now)[\s!.?,]*$/i;

function userConfirmsPublishNow(message: string): boolean {
  const trimmed = message.trim();
  return PUBLISH_CONFIRM_NOW.test(trimmed) || POST_NOW_VERB.test(trimmed);
}

function isSocialPlatform(value: string): value is SocialPlatform {
  return PLATFORMS.includes(value as SocialPlatform);
}

export function userWantsPublishNow(message: string): boolean {
  return (
    POST_NOW_VERB.test(message) ||
    PUBLISH_KEYWORDS.test(message) ||
    PLATFORM_PUBLISH_PATTERN.test(message)
  );
}

export function userWantsAllConnectedPlatforms(message: string): boolean {
  return (
    /\b(pe\s+toate|toate\s+(re[tț]elele|platformele|conturile)|all\s+(connected|networks|platforms)|post\s+to\s+all)\b/i.test(
      message,
    ) || POST_NOW_VERB.test(message)
  );
}

function conversationHasPendingPublish(messages: ChatMessage[]): boolean {
  if (
    messages.some(
      (message) =>
        message.role === "user" &&
        (userWantsPublishNow(message.content) ||
          PLATFORM_PUBLISH_PATTERN.test(message.content) ||
          /\bposteaz[aă]?\s+poza\b/i.test(message.content)),
    )
  ) {
    return true;
  }

  return [...messages]
    .reverse()
    .filter((message) => message.role === "assistant")
    .slice(0, 3)
    .some((message) =>
      /(?:posteaz[aă]?|postez|post)\s+acum|publish now|public[aă]\s+acum|pe ce platform|toate conturile|platforme.*(post|disponibile)|postez acum sau programez|post now or schedule/i.test(
        message.content,
      ),
    );
}

export function shouldAttemptPublish(
  lastUserMessage: string,
  messages: ChatMessage[],
): boolean {
  if (userWantsPublishNow(lastUserMessage)) {
    return true;
  }

  if (/\bposteaz[aă]?\s+poza\b/i.test(lastUserMessage)) {
    return true;
  }

  if (
    userConfirmsPublishNow(lastUserMessage) &&
    conversationHasPendingPublish(messages) &&
    conversationReadyToPublish(messages)
  ) {
    return true;
  }

  if (
    PUBLISH_RETRY_PATTERN.test(lastUserMessage) &&
    conversationHasPendingPublish(messages) &&
    conversationReadyToPublish(messages) &&
    lastAssistantPublishWasInconclusive(messages)
  ) {
    return true;
  }

  if (
    /\bpe toate conturile\b/i.test(lastUserMessage) &&
    conversationHasPendingPublish(messages)
  ) {
    return true;
  }

  if (
    userConfirmsScheduling(lastUserMessage) &&
    conversationHasPendingPublish(messages)
  ) {
    return true;
  }

  return false;
}

function detectTargetPlatforms(
  text: string,
  connectedPlatforms: SocialPlatform[],
): "all" | SocialPlatform[] {
  if (userWantsAllConnectedPlatforms(text)) {
    return "all";
  }

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

  const selected = patterns
    .filter(
      ([platform, pattern]) =>
        connectedPlatforms.includes(platform) && pattern.test(text),
    )
    .map(([platform]) => platform);

  if (selected.length > 0) {
    return selected;
  }

  return "all";
}

export function extractPublishFromConversation(options: {
  messages: ChatMessage[];
  connectedAccounts: ConnectedAccount[];
}): PublishInput | null {
  const { messages, connectedAccounts } = options;
  const connectedPlatforms = connectedAccounts
    .filter((account) => account.connected)
    .map((account) => account.platform);

  if (connectedPlatforms.length === 0) {
    return null;
  }

  const caption = extractCaption(messages);
  if (!caption) {
    return null;
  }

  const allText = messages.map((message) => message.content).join("\n");
  const targetPlatforms = detectTargetPlatforms(allText, connectedPlatforms);

  if (
    targetPlatforms !== "all" &&
    targetPlatforms.some((platform) => !isSocialPlatform(platform))
  ) {
    return null;
  }

  const media = findLatestPublishMedia(messages);
  if (!media) {
    return null;
  }

  return {
    caption,
    mediaUrl: media.url,
    mediaType: media.mediaType,
    targetPlatforms,
  };
}

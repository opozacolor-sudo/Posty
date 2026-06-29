import type { ConnectedAccount } from "./dashboard-data";
import { PLATFORMS, type SocialPlatform } from "./dashboard-data";
import type { ChatAttachment } from "./chat-upload";
import type { PublishInput } from "./publish";
import {
  extractCaption,
  findLatestMediaUrl,
  userConfirmsScheduling,
} from "./schedule-intent";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
};

const PUBLISH_KEYWORDS =
  /\b(post(eaz|ez)?\s+acum|post\s+now|publish\s+now|public[aă]\s+acum|trimite\s+acum|posteaz[aă]\s+pe\s+toate|pe\s+toate\s+(re[tț]elele|platformele)|toate\s+(re[tț]elele|platformele|conturile)|all\s+(connected|networks|platforms)|post\s+to\s+all)\b/i;

function isSocialPlatform(value: string): value is SocialPlatform {
  return PLATFORMS.includes(value as SocialPlatform);
}

export function userWantsPublishNow(message: string): boolean {
  return PUBLISH_KEYWORDS.test(message);
}

export function userWantsAllConnectedPlatforms(message: string): boolean {
  return (
    /\b(pe\s+toate|toate\s+(re[tț]elele|platformele|conturile)|all\s+(connected|networks|platforms)|post\s+to\s+all)\b/i.test(
      message,
    ) || /\bpost(eaz|ez)?\s+acum\b/i.test(message)
  );
}

function conversationHasPendingPublish(messages: ChatMessage[]): boolean {
  if (
    messages.some(
      (message) =>
        message.role === "user" && userWantsPublishNow(message.content),
    )
  ) {
    return true;
  }

  return [...messages]
    .reverse()
    .filter((message) => message.role === "assistant")
    .slice(0, 2)
    .some((message) =>
      /post(eaz|ez)?\s+acum|publish now|public[aă]\s+acum|spune ['"]da['"]\s*(ca\s*)?(sa\s*)?post/i.test(
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

  return {
    caption,
    mediaUrl: findLatestMediaUrl(messages),
    targetPlatforms,
  };
}

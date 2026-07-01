import type { ConnectedAccount } from "./dashboard-data";
import { PLATFORMS, type SocialPlatform } from "./dashboard-data";
import type { ChatAttachment } from "./chat-upload";
import {
  ALL_PLATFORMS_PUBLISH_PATTERN,
  messageWantsPublishAction,
  messageWantsScheduleAction,
  POST_NOW_VERB,
  userConfirmsPublishNow,
  userConfirmsSchedule,
} from "./chat-intent-triggers";
import type { PublishInput, PublishTarget } from "./publish";
import {
  detectFacebookPublishFormat,
  type FacebookPublishFormat,
} from "./publish-facebook";
import {
  detectInstagramPublishFormat,
  type InstagramPublishFormat,
} from "./publish-instagram";
import { extractCaption, findLatestPublishMedia } from "./schedule-intent";

export function resolveFacebookPublishFormats(text: string): FacebookPublishFormat[] {
  const formats: FacebookPublishFormat[] = [];

  if (/\b(?:fb|facebook)\s+(?:story|stories|povest)\b/i.test(text)) {
    formats.push("story");
  }

  if (/\b(?:fb|facebook)\s+reels?\b/i.test(text)) {
    formats.push("reel");
  }

  if (formats.length > 0) {
    return formats;
  }

  const wantsAll = ALL_PLATFORMS_PUBLISH_PATTERN.test(text);
  const wantsStoryOnFacebook =
    /\b(?:story|stories|povest)\b/i.test(text) &&
    /\b(?:fb|facebook)\b/i.test(text);

  if (wantsAll && wantsStoryOnFacebook) {
    return ["story", "reel"];
  }

  return [detectFacebookPublishFormat(text)];
}

export function resolveInstagramPublishFormats(text: string): InstagramPublishFormat[] {
  const formats: InstagramPublishFormat[] = [];

  if (/\b(?:insta(?:gram)?|\big\b)\s+(?:story|stories|povest)\b/i.test(text)) {
    formats.push("story");
  }

  if (/\b(?:insta(?:gram)?|\big\b)\s+reels?\b/i.test(text)) {
    formats.push("reel");
  }

  if (formats.length > 0) {
    return formats;
  }

  const wantsAll = ALL_PLATFORMS_PUBLISH_PATTERN.test(text);
  const wantsStoryOnInstagram =
    /\b(?:story|stories|povest)\b/i.test(text) &&
    /\b(?:insta(?:gram)?|\big\b)\b/i.test(text);

  if (wantsAll && wantsStoryOnInstagram) {
    return ["story", "reel"];
  }

  return [detectInstagramPublishFormat(text)];
}

function detectTikTokStoryRequest(text: string): boolean {
  return /\b(?:tiktok\s+(?:story|stories|povest)|(?:story|stories|povest)\s+(?:pe\s+)?tiktok)\b/i.test(
    text,
  );
}

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
};

const PUBLISH_KEYWORDS =
  /\b(?:posteaz[aă]?\s+poza|poza anterioar[aă]|posteaz[aă]\s+pe\s+toate|posteaz[aă]\s+video\s+pe\s+toate)\b/i;

const PLATFORM_PUBLISH_PATTERN =
  /\b(?:posteaz[aă]?|postez|post|public[aă]|publica|trimite|pune(?:-l|-o)?|upload(?:eaz[aă]?|ez)?)\s+(?:acum\s+)?(?:pe\s+)?(?:video(?:ul)?\s+(?:pe\s+)?)?(instagram|insta|\big\b|facebook|fb|linkedin|threads|pinterest|tiktok|youtube|\byt\b)\b/i;

const PUBLISH_RETRY_PATTERN =
  /\b(ai postat|s-a postat|a mers|re[iî]ncearc[aă]|(?:mai\s+)?(?:o\s+dat[aă]|din nou)|retry|post again|did it post|n-a mers|nu merge)\b/i;

export const RETRY_FAILED_ONLY_PATTERN =
  /\b(?:doar\s+(?:unde|pe\s+(?:cele|platformele)?)?(?:nu\s+s-a\s+postat|a\s+e[sș]uat|e[sș]uat(?:e)?)|(?:re[iî]ncearc[aă]|posteaz[aă]?)\s+(?:doar\s+)?(?:unde\s+(?:nu\s+s-a\s+postat|a\s+e[sș]uat)|(?:pe\s+)?(?:cele\s+)?e[sș]uate)|nu\s+mai\s+vreau\s+aceea[sș]i\s+comand[aă].*doar|only\s+(?:where|on)\s+(?:it\s+)?failed|retry\s+(?:only\s+)?failed)\b/i;

export function userWantsRetryFailedOnly(message: string): boolean {
  return RETRY_FAILED_ONLY_PATTERN.test(message);
}

function addPublishTarget(
  targets: PublishTarget[],
  target: PublishTarget,
): void {
  if (
    targets.some(
      (item) => item.platform === target.platform && item.format === target.format,
    )
  ) {
    return;
  }

  targets.push(target);
}

function parseFormatFromLabel(
  platform: SocialPlatform,
  format?: string,
): FacebookPublishFormat | InstagramPublishFormat | undefined {
  if (!format) {
    return undefined;
  }

  if (platform === "facebook" && (format === "feed" || format === "story" || format === "reel")) {
    return format;
  }

  if (platform === "instagram" && (format === "feed" || format === "story" || format === "reel")) {
    return format;
  }

  return undefined;
}

export function parseFailedFromPublishSummary(messages: ChatMessage[]): PublishTarget[] {
  const targets: PublishTarget[] = [];

  for (const message of [...messages].reverse()) {
    if (message.role !== "assistant") {
      continue;
    }

    if (!/Publicare finalizată|Publishing finished/i.test(message.content)) {
      continue;
    }

    for (const line of message.content.split("\n")) {
      const match = line.match(
        /^-\s+(\w+)(?:\s+\((\w+)\))?:\s+(?:e[sș]uat|failed|omis|skipped)\b/i,
      );

      if (!match?.[1] || !isSocialPlatform(match[1])) {
        continue;
      }

      addPublishTarget(targets, {
        platform: match[1],
        format: parseFormatFromLabel(match[1], match[2]),
      });
    }

    if (targets.length > 0) {
      return targets;
    }
  }

  return [];
}

export function parseFailedFromUserReport(text: string): PublishTarget[] {
  if (
    !/(?:nu s-a postat|n-a mers|nu merge|failed|e[sș]uat|didn't post|did not post)/i.test(
      text,
    )
  ) {
    return [];
  }

  const targets: PublishTarget[] = [];

  if (/\btiktok\b/i.test(text)) {
    addPublishTarget(targets, { platform: "tiktok" });
  }

  if (/\blinkedin\b/i.test(text)) {
    addPublishTarget(targets, { platform: "linkedin" });
  }

  if (/\b(?:fb|facebook)\s+(?:story|stories|povest)/i.test(text)) {
    addPublishTarget(targets, { platform: "facebook", format: "story" });
  }

  if (/\b(?:fb|facebook)\s+reels?\b/i.test(text)) {
    addPublishTarget(targets, { platform: "facebook", format: "reel" });
  }

  if (/\b(?:insta(?:gram)?|\big\b)\s+(?:story|stories|povest)/i.test(text)) {
    addPublishTarget(targets, { platform: "instagram", format: "story" });
  }

  if (/\b(?:insta(?:gram)?|\big\b)\s+reels?\b/i.test(text)) {
    addPublishTarget(targets, { platform: "instagram", format: "reel" });
  }

  if (
    /\b(?:fb|facebook)\b/i.test(text) &&
    !targets.some((item) => item.platform === "facebook")
  ) {
    addPublishTarget(targets, { platform: "facebook", format: "feed" });
  }

  if (
    /\b(?:insta(?:gram)?|\big\b)\b/i.test(text) &&
    !targets.some((item) => item.platform === "instagram")
  ) {
    addPublishTarget(targets, { platform: "instagram", format: "feed" });
  }

  return targets;
}

export function findFailedPublishTargets(messages: ChatMessage[]): PublishTarget[] {
  const fromSummary = parseFailedFromPublishSummary(messages);
  if (fromSummary.length > 0) {
    return fromSummary;
  }

  for (const message of [...messages].reverse()) {
    if (message.role !== "user") {
      continue;
    }

    const parsed = parseFailedFromUserReport(message.content);
    if (parsed.length > 0) {
      return parsed;
    }
  }

  return [];
}

function parseExplicitPublishTargets(
  text: string,
  connectedPlatforms: SocialPlatform[],
): PublishTarget[] {
  if (userWantsAllConnectedPlatforms(text)) {
    return [];
  }

  const targets: PublishTarget[] = [];
  const add = (target: PublishTarget) => {
    if (!connectedPlatforms.includes(target.platform)) {
      return;
    }
    addPublishTarget(targets, target);
  };

  if (/\b(?:fb|facebook)\s+(?:story|stories|povest)\b/i.test(text)) {
    add({ platform: "facebook", format: "story" });
  }

  if (/\b(?:fb|facebook)\s+reels?\b/i.test(text)) {
    add({ platform: "facebook", format: "reel" });
  }

  if (/\b(?:insta(?:gram)?|\big\b)\s+(?:story|stories|povest)\b/i.test(text)) {
    add({ platform: "instagram", format: "story" });
  }

  if (/\b(?:insta(?:gram)?|\big\b)\s+reels?\b/i.test(text)) {
    add({ platform: "instagram", format: "reel" });
  }

  const barePlatforms: Array<[SocialPlatform, RegExp]> = [
    ["tiktok", /\btiktok\b/i],
    ["linkedin", /\blinkedin\b/i],
    ["youtube", /\b(youtube|\byt\b)\b/i],
    ["threads", /\bthreads\b/i],
    ["pinterest", /\bpinterest\b/i],
    ["x", /\b(\bx\b|twitter)\b/i],
    ["bluesky", /\bbluesky\b/i],
  ];

  for (const [platform, pattern] of barePlatforms) {
    if (pattern.test(text)) {
      add({ platform });
    }
  }

  if (
    /\b(?:fb|facebook)\b/i.test(text) &&
    !targets.some((item) => item.platform === "facebook")
  ) {
    add({ platform: "facebook", format: "feed" });
  }

  if (
    /\b(?:insta(?:gram)?|\big\b)\b/i.test(text) &&
    !targets.some((item) => item.platform === "instagram")
  ) {
    add({ platform: "instagram", format: "feed" });
  }

  return targets;
}

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

function isSocialPlatform(value: string): value is SocialPlatform {
  return PLATFORMS.includes(value as SocialPlatform);
}

export function userWantsPublishNow(message: string): boolean {
  return (
    messageWantsPublishAction(message) ||
    PUBLISH_KEYWORDS.test(message) ||
    ALL_PLATFORMS_PUBLISH_PATTERN.test(message) ||
    PLATFORM_PUBLISH_PATTERN.test(message)
  );
}

export function userWantsAllConnectedPlatforms(message: string): boolean {
  return ALL_PLATFORMS_PUBLISH_PATTERN.test(message) || POST_NOW_VERB.test(message);
}

function extractCaptionFromPublishText(text: string): string | null {
  const inlineCaption = text.match(
    /\b(?:cu (?:textul|descrierea|descriere|caption(?:ul)?)|with (?:the )?(?:text|caption|description)|(?:caption|description|descrierea|descriere))[:\s]+([\s\S]+)$/i,
  );

  return inlineCaption?.[1]?.trim() ?? null;
}

export function findLatestPublishCommandMessage(
  messages: ChatMessage[],
): ChatMessage | null {
  const userMessages = messages.filter((message) => message.role === "user");

  for (let index = userMessages.length - 1; index >= 0; index -= 1) {
    const message = userMessages[index];
    const content = message.content;

    if (
      userWantsPublishNow(content) ||
      PLATFORM_PUBLISH_PATTERN.test(content) ||
      /\bposteaz[aă]?\s+poza\b/i.test(content)
    ) {
      return message;
    }

    if (userConfirmsPublishNow(content) || PUBLISH_RETRY_PATTERN.test(content)) {
      continue;
    }

    break;
  }

  return null;
}

function detectTargetPlatforms(
  text: string,
  connectedPlatforms: SocialPlatform[],
): "all" | SocialPlatform[] {
  // "pe toate platformele, inclusiv story pe facebook și instagram" → all connected,
  // not only facebook + instagram (platform names there are format hints).
  if (userWantsAllConnectedPlatforms(text)) {
    return "all";
  }

  const patterns: Array<[SocialPlatform, RegExp]> = [
    ["instagram", /\b(instagram|insta|\big\b)\b/i],
    ["tiktok", /\btiktok\b/i],
    ["youtube", /\b(youtube|\byt\b)\b/i],
    ["facebook", /\b(facebook|\bfb\b)\b/i],
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
      /(?:posteaz[aă]?|postez|post|public[aă]|publish)\s+(?:acum|now)|pe ce platform|toate conturile|platforme.*(post|disponibile)|postez acum sau programez|post now or schedule|vrei să post|salv(?:ez|ați)|public(?:ăm|am)\s+acum/i.test(
        message.content,
      ),
    );
}

export function shouldAttemptPublish(
  lastUserMessage: string,
  messages: ChatMessage[],
): boolean {
  if (messageWantsScheduleAction(lastUserMessage) && !userWantsPublishNow(lastUserMessage)) {
    return false;
  }

  if (userWantsPublishNow(lastUserMessage)) {
    return true;
  }

  if (/\bposteaz[aă]?\s+poza\b/i.test(lastUserMessage)) {
    return true;
  }

  if (userWantsRetryFailedOnly(lastUserMessage) && conversationReadyToPublish(messages)) {
    return findFailedPublishTargets(messages).length > 0;
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
    userConfirmsSchedule(lastUserMessage) &&
    conversationHasPendingPublish(messages) &&
    !messageWantsScheduleAction(lastUserMessage)
  ) {
    return true;
  }

  return false;
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

  const publishMessage = findLatestPublishCommandMessage(messages);
  const lastUserMessage =
    [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const publishText =
    publishMessage?.content ?? lastUserMessage;

  const retryFailedOnly = userWantsRetryFailedOnly(lastUserMessage);
  const failedTargets = retryFailedOnly ? findFailedPublishTargets(messages) : [];

  const caption =
    extractCaptionFromPublishText(publishText) ?? extractCaption(messages);
  if (!caption) {
    return null;
  }

  const media = findLatestPublishMedia(messages);
  if (!media) {
    return null;
  }

  if (retryFailedOnly) {
    if (failedTargets.length === 0) {
      return null;
    }

    return {
      caption,
      mediaUrl: media.url,
      mediaStoragePaths: media.storagePaths,
      mediaType: media.mediaType,
      targetPlatforms: failedTargets.map((target) => target.platform),
      publishTargets: failedTargets,
      facebookFormats: resolveFacebookPublishFormats(publishText),
      instagramFormats: resolveInstagramPublishFormats(publishText),
      facebookFormat: detectFacebookPublishFormat(publishText),
      instagramFormat: detectInstagramPublishFormat(publishText),
      tiktokStoryRequested: detectTikTokStoryRequest(publishText),
      publishText,
    };
  }

  const explicitTargets = parseExplicitPublishTargets(publishText, connectedPlatforms);
  if (explicitTargets.length > 0) {
    return {
      caption,
      mediaUrl: media.url,
      mediaStoragePaths: media.storagePaths,
      mediaType: media.mediaType,
      targetPlatforms: explicitTargets.map((target) => target.platform),
      publishTargets: explicitTargets,
      facebookFormats: resolveFacebookPublishFormats(publishText),
      instagramFormats: resolveInstagramPublishFormats(publishText),
      facebookFormat: detectFacebookPublishFormat(publishText),
      instagramFormat: detectInstagramPublishFormat(publishText),
      tiktokStoryRequested: detectTikTokStoryRequest(publishText),
      publishText,
    };
  }

  const targetPlatforms = detectTargetPlatforms(publishText, connectedPlatforms);

  if (
    targetPlatforms !== "all" &&
    targetPlatforms.some((platform) => !isSocialPlatform(platform))
  ) {
    return null;
  }

  return {
    caption,
    mediaUrl: media.url,
    mediaStoragePaths: media.storagePaths,
    mediaType: media.mediaType,
    targetPlatforms,
    facebookFormats: resolveFacebookPublishFormats(publishText),
    instagramFormats: resolveInstagramPublishFormats(publishText),
    facebookFormat: detectFacebookPublishFormat(publishText),
    instagramFormat: detectInstagramPublishFormat(publishText),
    tiktokStoryRequested: detectTikTokStoryRequest(publishText),
    publishText,
  };
}

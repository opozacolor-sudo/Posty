import type { SocialPlatform } from "./dashboard-data";
import { ALL_PLATFORMS_PUBLISH_PATTERN } from "./chat-intent-triggers";
import type { FacebookPublishFormat } from "./publish-facebook";
import type { InstagramPublishFormat } from "./publish-instagram";
import type { PublishTarget } from "./publish";

const VIDEO_FEED_PLATFORMS: SocialPlatform[] = [
  "tiktok",
  "youtube",
  "threads",
  "linkedin",
];

function wantsStoryOnMeta(text: string): boolean {
  return (
    /\b(?:story|stories|povest)\b/i.test(text) &&
    (/\b(?:fb|facebook|insta(?:gram)?|\big\b)\b/i.test(text) ||
      ALL_PLATFORMS_PUBLISH_PATTERN.test(text))
  );
}

function addTarget(
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

/** One-command video publish: feed everywhere + story & reel on Meta when requested. */
export function buildAllPlatformsVideoTargets(
  connectedPlatforms: SocialPlatform[],
  publishText: string,
): PublishTarget[] {
  const targets: PublishTarget[] = [];
  const includeMetaStories = wantsStoryOnMeta(publishText);

  for (const platform of connectedPlatforms) {
    if (platform === "pinterest" || platform === "x" || platform === "bluesky") {
      continue;
    }

    if (platform === "facebook") {
      if (includeMetaStories) {
        addTarget(targets, { platform: "facebook", format: "story" });
      }
      addTarget(targets, { platform: "facebook", format: "reel" });
      continue;
    }

    if (platform === "instagram") {
      if (includeMetaStories) {
        addTarget(targets, { platform: "instagram", format: "story" });
      }
      addTarget(targets, { platform: "instagram", format: "reel" });
      continue;
    }

    if (VIDEO_FEED_PLATFORMS.includes(platform)) {
      addTarget(targets, { platform });
    }
  }

  return targets;
}

export function expandPublishTargets(
  input: {
    targetPlatforms: "all" | SocialPlatform[];
    publishTargets?: PublishTarget[];
    mediaType?: "image" | "video" | null;
    facebookFormats?: FacebookPublishFormat[];
    instagramFormats?: InstagramPublishFormat[];
  },
  connectedPlatforms: SocialPlatform[],
  publishText: string,
): PublishTarget[] {
  if (input.publishTargets?.length) {
    return input.publishTargets;
  }

  if (input.targetPlatforms === "all" && input.mediaType === "video") {
    return buildAllPlatformsVideoTargets(connectedPlatforms, publishText);
  }

  const targets: PublishTarget[] = [];

  const platforms =
    input.targetPlatforms === "all" ? connectedPlatforms : input.targetPlatforms;

  for (const platform of platforms) {
    if (platform === "facebook") {
      const formats = input.facebookFormats ?? ["feed"];
      for (const format of formats) {
        addTarget(targets, { platform: "facebook", format });
      }
      continue;
    }

    if (platform === "instagram") {
      const formats = input.instagramFormats ?? ["feed"];
      for (const format of formats) {
        addTarget(targets, { platform: "instagram", format });
      }
      continue;
    }

    addTarget(targets, { platform });
  }

  return targets;
}

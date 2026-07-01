import type { SupabaseClient } from "@supabase/supabase-js";
import type { SocialPlatform } from "./dashboard-data";
import { PLATFORMS } from "./dashboard-data";
import { expandPublishTargets } from "./publish-all-targets";
import { fetchConnectedAccountsWithTokens } from "./publish-accounts";
import {
  detectFacebookPublishFormat,
  publishFacebookContent,
  type FacebookPublishFormat,
} from "./publish-facebook";
import {
  publishInstagramContent,
  type InstagramPublishFormat,
} from "./publish-instagram";
import { publishLinkedInContent } from "./publish-linkedin";
import {
  buildChunkedPublishMediaProxyUrl,
  fetchPublishMediaBytes,
  resolvePublishMediaUrl,
} from "./publish-media-url";
import { publishPinterestPin } from "./publish-pinterest";
import { publishThreadsPost } from "./publish-threads";
import { publishTikTokContent } from "./publish-tiktok";
import { publishYouTubeVideo } from "./publish-youtube";

export type PublishMediaType = "image" | "video";

export type PublishTarget = {
  platform: SocialPlatform;
  format?: FacebookPublishFormat | InstagramPublishFormat;
};

export type PublishInput = {
  caption: string;
  mediaUrl?: string | null;
  mediaStoragePaths?: string[];
  mediaType?: PublishMediaType | null;
  targetPlatforms: "all" | SocialPlatform[];
  /** When set, only these platform/format pairs are published (retry failed). */
  publishTargets?: PublishTarget[];
  facebookFormats?: FacebookPublishFormat[];
  instagramFormats?: InstagramPublishFormat[];
  /** @deprecated use facebookFormats */
  facebookFormat?: FacebookPublishFormat;
  /** @deprecated use instagramFormats */
  instagramFormat?: InstagramPublishFormat;
  tiktokStoryRequested?: boolean;
  /** Original user command — used to expand “all platforms” targets. */
  publishText?: string;
};

export type PublishPlatformResult = {
  platform: SocialPlatform;
  format?: FacebookPublishFormat | InstagramPublishFormat;
  success: boolean;
  postId?: string;
  detail?: string;
  error?: string;
  skipped?: boolean;
};

const UNSUPPORTED_REASONS: Partial<Record<SocialPlatform, string>> = {
  x: "X is not connected in Posty yet",
  bluesky: "Bluesky is not connected in Posty yet",
};

function isSocialPlatform(value: string): value is SocialPlatform {
  return PLATFORMS.includes(value as SocialPlatform);
}

function requiresImage(platform: SocialPlatform): boolean {
  return (
    platform === "instagram" ||
    platform === "facebook" ||
    platform === "pinterest"
  );
}

function requiresVideo(platform: SocialPlatform): boolean {
  return platform === "youtube";
}

type PublishMediaPayload = {
  mediaType: PublishMediaType | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  videoBytes?: Buffer;
  videoContentType?: string;
};

async function publishToPlatform(
  platform: SocialPlatform,
  accessToken: string,
  caption: string,
  media: PublishMediaPayload,
  platformMetadata: Record<string, string> = {},
  refreshToken: string | null = null,
  facebookFormat: FacebookPublishFormat = "feed",
  instagramFormat: InstagramPublishFormat = "feed",
  tiktokStoryRequested = false,
): Promise<PublishPlatformResult> {
  if (platform === "tiktok") {
    if (media.mediaType === "video") {
      if (!media.videoBytes) {
        return {
          platform,
          success: false,
          skipped: true,
          error: `${platform} needs a video attached with 📎 (mp4/mov)`,
        };
      }
    } else if (!media.imageUrl) {
      return {
        platform,
        success: false,
        error: `${platform} needs a photo or video attached with 📎`,
      };
    }

    const result = await publishTikTokContent({
      accessToken,
      refreshToken,
      caption,
      mediaType: media.mediaType === "video" ? "video" : "image",
      imageUrl: media.imageUrl,
      videoBytes: media.videoBytes,
      contentType: media.videoContentType ?? "video/mp4",
      storyRequested: tiktokStoryRequested,
    });

    return result.ok
      ? {
          platform,
          success: true,
          postId: result.postId,
          detail: result.detail,
        }
      : { platform, success: false, error: result.error };
  }

  if (requiresVideo(platform)) {
    if (media.mediaType !== "video" || !media.videoBytes) {
      return {
        platform,
        success: false,
        skipped: true,
        error: `${platform} needs a video attached with 📎 (mp4/mov)`,
      };
    }

    if (platform === "youtube") {
      const result = await publishYouTubeVideo({
        accessToken,
        refreshToken,
        caption,
        videoBytes: media.videoBytes,
        contentType: media.videoContentType ?? "video/mp4",
      });

      return result.ok
        ? {
            platform,
            success: true,
            postId: result.postId,
            detail: result.detail,
          }
        : { platform, success: false, error: result.error };
    }
  }

  if (platform === "facebook") {
    const result = await publishFacebookContent({
      accessToken,
      pageId: platformMetadata.pageId,
      caption,
      format: facebookFormat,
      mediaType: media.mediaType === "video" ? "video" : "image",
      imageUrl: media.imageUrl,
      videoUrl: media.videoUrl,
    });

    return result.ok
      ? {
          platform,
          success: true,
          postId: result.postId,
          detail: result.detail,
        }
      : { platform, success: false, error: result.error };
  }

  if (platform === "instagram") {
    const result = await publishInstagramContent({
      accessToken,
      caption,
      format: instagramFormat,
      mediaType: media.mediaType === "video" ? "video" : "image",
      imageUrl: media.imageUrl,
      videoUrl: media.videoUrl,
    });

    return result.ok
      ? {
          platform,
          success: true,
          postId: result.postId,
          detail: result.detail,
        }
      : { platform, success: false, error: result.error };
  }

  if (platform === "threads") {
    const result = await publishThreadsPost({
      accessToken,
      caption,
      mediaType: media.mediaType === "video" ? "video" : media.imageUrl ? "image" : null,
      imageUrl: media.imageUrl,
      videoUrl: media.videoUrl,
    });

    return result.ok
      ? {
          platform,
          success: true,
          postId: result.postId,
          detail: result.detail,
        }
      : { platform, success: false, error: result.error };
  }

  if (platform === "linkedin") {
    if (media.mediaType === "video") {
      const result = await publishLinkedInContent({
        accessToken,
        caption,
        mediaType: "video",
        videoBytes: media.videoBytes,
      });

      return result.ok
        ? {
            platform,
            success: true,
            postId: result.postId,
            detail: result.detail,
          }
        : { platform, success: false, error: result.error };
    }

    if (media.imageUrl) {
      const result = await publishLinkedInContent({
        accessToken,
        caption,
        mediaType: "image",
        imageUrl: media.imageUrl,
      });

      return result.ok
        ? { platform, success: true, postId: result.postId }
        : { platform, success: false, error: result.error };
    }

    return {
      platform,
      success: false,
      error: `${platform} needs a photo or video attached to the post`,
    };
  }

  if (media.mediaType === "video") {
    return {
      platform,
      success: false,
      skipped: true,
      error: `${platform} accepts photos only, not video`,
    };
  }

  if (requiresImage(platform) && !media.imageUrl) {
    return {
      platform,
      success: false,
      error: `${platform} needs an image attached to the post`,
    };
  }

  if (platform === "pinterest" && media.imageUrl) {
    const result = await publishPinterestPin({
      accessToken,
      boardId: platformMetadata.boardId,
      caption,
      imageUrl: media.imageUrl,
    });

    return result.ok
      ? { platform, success: true, postId: result.postId }
      : { platform, success: false, error: result.error };
  }

  return {
    platform,
    success: false,
    skipped: true,
    error: UNSUPPORTED_REASONS[platform] ?? "Publishing not available for this platform yet",
  };
}

async function runPublishTasks(
  tasks: Array<() => Promise<PublishPlatformResult>>,
): Promise<PublishPlatformResult[]> {
  const results: PublishPlatformResult[] = [];

  for (const task of tasks) {
    results.push(await task());
  }

  return results;
}

export async function publishToConnectedPlatforms(
  userId: string,
  input: PublishInput,
  options?: {
    sessionClient?: SupabaseClient;
    appBaseUrl?: string;
  },
): Promise<PublishPlatformResult[]> {
  const accounts = await fetchConnectedAccountsWithTokens(
    userId,
    options?.sessionClient,
  );

  if (accounts.length === 0) {
    return [];
  }

  const mediaUrl = input.mediaUrl;
  const mediaType = input.mediaType ?? null;

  const connectedPlatforms = accounts.map((account) => account.platform);
  const publishText = input.publishText ?? "";
  const resolvedTargets = expandPublishTargets(
    input,
    connectedPlatforms,
    publishText,
  );

  let imageUrl: string | null = null;
  let videoUrl: string | null = null;
  let videoBytes: Buffer | undefined;
  let videoContentType: string | undefined;

  if (mediaType === "video" && mediaUrl) {
    if (input.mediaStoragePaths?.length) {
      videoUrl =
        buildChunkedPublishMediaProxyUrl(
          input.mediaStoragePaths,
          options?.appBaseUrl,
        ) ?? (await resolvePublishMediaUrl(mediaUrl, options?.appBaseUrl));
    } else {
      videoUrl = await resolvePublishMediaUrl(mediaUrl, options?.appBaseUrl);
    }
    const needsVideoBytes = resolvedTargets.some(
      (target) =>
        target.platform === "youtube" ||
        target.platform === "tiktok" ||
        target.platform === "linkedin",
    );

    if (needsVideoBytes) {
      const downloaded = await fetchPublishMediaBytes(mediaUrl, input.mediaStoragePaths);
      if (!downloaded) {
        return resolvedTargets.map((target) => ({
          platform: target.platform,
          format: target.format,
          success: false,
          error: "Could not download video for publishing",
        }));
      }
      videoBytes = downloaded.bytes;
      videoContentType = downloaded.contentType;
    }

    if (
      resolvedTargets.some(
        (target) =>
          target.platform === "facebook" ||
          target.platform === "instagram" ||
          target.platform === "threads",
      ) &&
      !videoUrl
    ) {
      return resolvedTargets.map((target) => ({
        platform: target.platform,
        format: target.format,
        success: false,
        error: "Could not prepare video URL for publishing",
      }));
    }
  } else if (mediaUrl) {
    imageUrl = await resolvePublishMediaUrl(mediaUrl, options?.appBaseUrl);

    if (resolvedTargets.some((target) => target.platform === "tiktok") && !imageUrl) {
      return resolvedTargets.map((target) => ({
        platform: target.platform,
        format: target.format,
        success: false,
        error: "Could not prepare image URL for publishing",
      }));
    }
  }

  const mediaPayload: PublishMediaPayload = {
    mediaType,
    imageUrl,
    videoUrl,
    videoBytes,
    videoContentType,
  };

  const parallelTasks: Array<() => Promise<PublishPlatformResult>> = [];
  const facebookTasks: Array<() => Promise<PublishPlatformResult>> = [];

  for (const target of resolvedTargets) {
    const platform = target.platform;
    if (!isSocialPlatform(platform)) {
      continue;
    }

    const account = accounts.find((item) => item.platform === platform);
    const run = (): Promise<PublishPlatformResult> => {
      if (!account) {
        return Promise.resolve({
          platform,
          format: target.format,
          success: false,
          error: "Account not connected",
        });
      }

      const facebookFormat =
        platform === "facebook"
          ? ((target.format as FacebookPublishFormat | undefined) ?? "feed")
          : (input.facebookFormat ?? "feed");
      const instagramFormat =
        platform === "instagram"
          ? ((target.format as InstagramPublishFormat | undefined) ?? "feed")
          : (input.instagramFormat ?? "feed");

      return publishToPlatform(
        platform,
        account.accessToken,
        input.caption,
        mediaPayload,
        account.platformMetadata,
        account.refreshToken,
        facebookFormat,
        instagramFormat,
        input.tiktokStoryRequested ?? false,
      ).then((result) => ({ ...result, format: target.format }));
    };

    if (platform === "facebook") {
      facebookTasks.push(run);
    } else {
      parallelTasks.push(run);
    }
  }

  const [parallelResults, facebookResults] = await Promise.all([
    Promise.all(parallelTasks.map((task) => task())),
    runPublishTasks(facebookTasks),
  ]);

  return [...parallelResults, ...facebookResults];
}

export function formatPublishResultsSummary(
  results: PublishPlatformResult[],
  locale: string,
): string {
  if (results.length === 0) {
    return locale === "ro"
      ? "Nu am găsit conturi conectate pentru publicare."
      : "No connected accounts were found to publish to.";
  }

  const lines = results.map((result) => {
    const label = result.format ? `${result.platform} (${result.format})` : result.platform;
    if (result.success) {
      const extra = result.detail ? ` → ${result.detail}` : result.postId ? ` (id: ${result.postId})` : "";
      return locale === "ro"
        ? `- ${label}: publicat cu succes${extra}`
        : `- ${label}: published successfully${extra}`;
    }

    if (result.skipped) {
      return locale === "ro"
        ? `- ${label}: omis (${result.error})`
        : `- ${label}: skipped (${result.error})`;
    }

    return locale === "ro"
      ? `- ${label}: eșuat (${result.error})`
      : `- ${label}: failed (${result.error})`;
  });

  const successCount = results.filter((result) => result.success).length;

  if (locale === "ro") {
    return [
      `Publicare finalizată: ${successCount}/${results.length} reușite.`,
      ...lines,
    ].join("\n");
  }

  return [`Publishing finished: ${successCount}/${results.length} succeeded.`, ...lines].join(
    "\n",
  );
}

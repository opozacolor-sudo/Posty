import type { SupabaseClient } from "@supabase/supabase-js";
import type { SocialPlatform } from "./dashboard-data";
import { PLATFORMS } from "./dashboard-data";
import { fetchConnectedAccountsWithTokens } from "./publish-accounts";
import { publishFacebookPhotoPost } from "./publish-facebook";
import { publishInstagramPost } from "./publish-instagram";
import { publishLinkedInImagePost } from "./publish-linkedin";
import { publishPinterestPin } from "./publish-pinterest";
import { publishThreadsPost } from "./publish-threads";

export type PublishInput = {
  caption: string;
  mediaUrl?: string | null;
  targetPlatforms: "all" | SocialPlatform[];
};

export type PublishPlatformResult = {
  platform: SocialPlatform;
  success: boolean;
  postId?: string;
  error?: string;
  skipped?: boolean;
};

const VIDEO_ONLY_REASONS: Partial<Record<SocialPlatform, string>> = {
  tiktok: "TikTok accepts video only, not photo posts",
  youtube: "YouTube accepts video only, not photo posts",
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
    platform === "linkedin" ||
    platform === "pinterest"
  );
}

async function publishToPlatform(
  platform: SocialPlatform,
  accessToken: string,
  caption: string,
  mediaUrl?: string | null,
  platformMetadata: Record<string, string> = {},
): Promise<PublishPlatformResult> {
  if (VIDEO_ONLY_REASONS[platform]) {
    return {
      platform,
      success: false,
      skipped: true,
      error: VIDEO_ONLY_REASONS[platform],
    };
  }

  if (requiresImage(platform) && !mediaUrl) {
    return {
      platform,
      success: false,
      error: `${platform} needs an image attached to the post`,
    };
  }

  if (platform === "instagram" && mediaUrl) {
    const result = await publishInstagramPost({
      accessToken,
      caption,
      imageUrl: mediaUrl,
    });

    return result.ok
      ? { platform, success: true, postId: result.postId }
      : { platform, success: false, error: result.error };
  }

  if (platform === "threads") {
    const result = await publishThreadsPost({
      accessToken,
      caption,
      imageUrl: mediaUrl,
    });

    return result.ok
      ? { platform, success: true, postId: result.postId }
      : { platform, success: false, error: result.error };
  }

  if (platform === "facebook" && mediaUrl) {
    const result = await publishFacebookPhotoPost({
      accessToken,
      pageId: platformMetadata.pageId,
      caption,
      imageUrl: mediaUrl,
    });

    return result.ok
      ? { platform, success: true, postId: result.postId }
      : { platform, success: false, error: result.error };
  }

  if (platform === "linkedin" && mediaUrl) {
    const result = await publishLinkedInImagePost({
      accessToken,
      caption,
      imageUrl: mediaUrl,
    });

    return result.ok
      ? { platform, success: true, postId: result.postId }
      : { platform, success: false, error: result.error };
  }

  if (platform === "pinterest" && mediaUrl) {
    const result = await publishPinterestPin({
      accessToken,
      boardId: platformMetadata.boardId,
      caption,
      imageUrl: mediaUrl,
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

export async function publishToConnectedPlatforms(
  userId: string,
  input: PublishInput,
  options?: {
    sessionClient?: SupabaseClient;
    mediaUrl?: string | null;
  },
): Promise<PublishPlatformResult[]> {
  const accounts = await fetchConnectedAccountsWithTokens(
    userId,
    options?.sessionClient,
  );

  if (accounts.length === 0) {
    return [];
  }

  const mediaUrl = options?.mediaUrl ?? input.mediaUrl;

  const connectedPlatforms = accounts.map((account) => account.platform);
  const targets =
    input.targetPlatforms === "all"
      ? connectedPlatforms
      : input.targetPlatforms.filter((platform) =>
          connectedPlatforms.includes(platform),
        );

  const results: PublishPlatformResult[] = [];

  for (const platform of targets) {
    if (!isSocialPlatform(platform)) {
      continue;
    }

    const account = accounts.find((item) => item.platform === platform);
    if (!account) {
      results.push({
        platform,
        success: false,
        error: "Account not connected",
      });
      continue;
    }

    results.push(
      await publishToPlatform(
        platform,
        account.accessToken,
        input.caption,
        mediaUrl,
        account.platformMetadata,
      ),
    );
  }

  return results;
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
    const label = result.platform;
    if (result.success) {
      return locale === "ro"
        ? `- ${label}: publicat cu succes`
        : `- ${label}: published successfully`;
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

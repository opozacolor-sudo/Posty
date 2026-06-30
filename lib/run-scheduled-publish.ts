import { getAppBaseUrl } from "./app-url";
import type { SocialPlatform } from "./dashboard-data";
import type { PublishMediaType } from "./publish";
import { publishToConnectedPlatforms } from "./publish";
import { detectFacebookPublishFormat } from "./publish-facebook";
import {
  claimScheduledPostForPublish,
  inferScheduledMediaType,
  markScheduledPostFailed,
  markScheduledPostPublished,
  releaseScheduledPostAfterFailure,
  type ScheduledPostRow,
} from "./scheduled-posts";

const MAX_POSTS_PER_RUN = 8;
const MAX_PUBLISH_ATTEMPTS = 5;

const PERMANENT_FAILURE_PATTERNS = [
  /account not connected/i,
  /not connected in posty/i,
  /needs an image attached/i,
  /needs a video attached/i,
  /accepts photos only/i,
  /scheduled_at_in_past/i,
  /no pinterest board/i,
  /scope_not_authorized/i,
  /access token expired/i,
  /reconnect/i,
];

export type ScheduledPublishRunResult = {
  processed: number;
  published: number;
  failed: number;
  retried: number;
  errors: Array<{ id: string; error: string }>;
};

function isPermanentPublishFailure(error: string): boolean {
  return PERMANENT_FAILURE_PATTERNS.some((pattern) => pattern.test(error));
}

function summarizePublishError(
  results: Awaited<ReturnType<typeof publishToConnectedPlatforms>>,
): string {
  const result = results[0];
  if (!result) {
    return "No publish result returned";
  }

  if (result.success) {
    return "";
  }

  return result.error ?? result.detail ?? "Publish failed";
}

async function publishScheduledPost(
  post: ScheduledPostRow,
  appBaseUrl: string,
): Promise<{ ok: true } | { ok: false; error: string; permanent: boolean }> {
  const caption = post.caption?.trim() || post.title.trim();
  if (!caption) {
    return { ok: false, error: "Missing caption", permanent: true };
  }

  const mediaType: PublishMediaType | null =
    post.media_type === "video" || post.media_type === "image"
      ? post.media_type
      : inferScheduledMediaType(post.media_url);

  if (!post.media_url && mediaType !== null) {
    return { ok: false, error: "Missing media URL", permanent: true };
  }

  const results = await publishToConnectedPlatforms(
    post.user_id,
    {
      caption,
      mediaUrl: post.media_url,
      mediaType,
      targetPlatforms: [post.platform as SocialPlatform],
      facebookFormat: detectFacebookPublishFormat(`${post.title}\n${caption}`),
    },
    { appBaseUrl },
  );

  const error = summarizePublishError(results);
  if (!error) {
    return { ok: true };
  }

  return {
    ok: false,
    error,
    permanent: isPermanentPublishFailure(error),
  };
}

export async function runScheduledPublish(options?: {
  limit?: number;
  appBaseUrl?: string;
}): Promise<ScheduledPublishRunResult> {
  const appBaseUrl = options?.appBaseUrl ?? getAppBaseUrl();
  const limit = options?.limit ?? MAX_POSTS_PER_RUN;
  const summary: ScheduledPublishRunResult = {
    processed: 0,
    published: 0,
    failed: 0,
    retried: 0,
    errors: [],
  };

  for (let index = 0; index < limit; index += 1) {
    const post = await claimScheduledPostForPublish();
    if (!post) {
      break;
    }

    summary.processed += 1;

    try {
      const outcome = await publishScheduledPost(post, appBaseUrl);

      if (outcome.ok) {
        await markScheduledPostPublished(post.id);
        summary.published += 1;
        continue;
      }

      summary.errors.push({ id: post.id, error: outcome.error });

      const attempts = post.publish_attempts + 1;
      const exhausted = attempts >= MAX_PUBLISH_ATTEMPTS;
      const permanent = outcome.permanent || exhausted;

      if (permanent) {
        await markScheduledPostFailed(post.id, outcome.error);
        summary.failed += 1;
      } else {
        await releaseScheduledPostAfterFailure(post.id, outcome.error, attempts);
        summary.retried += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      summary.errors.push({ id: post.id, error: message });

      const attempts = post.publish_attempts + 1;
      if (attempts >= MAX_PUBLISH_ATTEMPTS) {
        await markScheduledPostFailed(post.id, message);
        summary.failed += 1;
      } else {
        await releaseScheduledPostAfterFailure(post.id, message, attempts);
        summary.retried += 1;
      }
    }
  }

  return summary;
}

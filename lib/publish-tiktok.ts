import { refreshTikTokAccessToken } from "./tiktok-oauth";
import { convertImageToVideoBytes } from "./tiktok-image-to-video";

type TikTokApiError = {
  code?: string;
  message?: string;
};

type TikTokApiResponse<T> = {
  data?: T;
  error?: TikTokApiError;
};

type CreatorInfo = {
  privacy_level_options?: string[];
  comment_disabled?: boolean;
  duet_disabled?: boolean;
  stitch_disabled?: boolean;
  max_video_post_duration_sec?: number;
};

type PublishStatus = {
  status?: string;
  fail_reason?: string;
  publicaly_available_post_id?: string[];
};

const TIKTOK_API = "https://open.tiktokapis.com";
const MAX_POLL_ATTEMPTS = 25;
const POLL_DELAY_MS = 3000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tikTokErrorMessage(error?: TikTokApiError, fallback = "TikTok API error"): string {
  if (!error?.code || error.code === "ok") {
    return fallback;
  }

  if (error.code === "scope_not_authorized") {
    return "TikTok video.publish scope missing — reconnect TikTok in Accounts";
  }

  if (error.code === "access_token_invalid") {
    return "TikTok access token expired — reconnect TikTok in Accounts";
  }

  if (error.code === "unaudited_client_can_only_post_to_private_accounts") {
    return "TikTok: postările publice pentru utilizatori necesită App Review TikTok (Production). În Sandbox, TikTok limitează doar testarea internă — nu e cerința Posty. Trimite aplicația la review în TikTok Developer.";
  }

  if (error.code === "url_ownership_unverified") {
    return "TikTok: URL-ul imaginii nu e verificat — adaugă posty-ashen.vercel.app în TikTok Developer → Manage URL properties";
  }

  return error.message?.trim() || error.code || fallback;
}

function normalizeVideoContentType(contentType: string): string {
  const normalized = contentType.split(";")[0]?.trim().toLowerCase() ?? "video/mp4";

  if (
    normalized === "video/mp4" ||
    normalized === "video/quicktime" ||
    normalized === "video/webm"
  ) {
    return normalized;
  }

  return "video/mp4";
}

function pickPrivacyLevel(
  options: string[] | undefined,
  preferSelfOnly = false,
): string {
  const available = options ?? ["SELF_ONLY"];
  const forcePublic =
    process.env.TIKTOK_PUBLISH_PUBLIC?.trim().toLowerCase() === "true";

  if (
    (preferSelfOnly ||
      !forcePublic ||
      process.env.TIKTOK_PUBLISH_SELF_ONLY?.trim().toLowerCase() === "true") &&
    available.includes("SELF_ONLY")
  ) {
    return "SELF_ONLY";
  }

  const preferred = [
    "PUBLIC_TO_EVERYONE",
    "MUTUAL_FOLLOW_FRIENDS",
    "FOLLOWER_OF_CREATOR",
    "SELF_ONLY",
  ];

  for (const level of preferred) {
    if (available.includes(level)) {
      return level;
    }
  }

  return available[0] ?? "SELF_ONLY";
}

function shouldRetryWithSelfOnly(error?: TikTokApiError): boolean {
  const code = error?.code;
  return (
    code === "unaudited_client_can_only_post_to_private_accounts" ||
    code === "privacy_level_option_mismatch"
  );
}

async function queryCreatorInfo(
  accessToken: string,
): Promise<{ ok: true; info: CreatorInfo } | { ok: false; error: string }> {
  const response = await fetch(`${TIKTOK_API}/v2/post/publish/creator_info/query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
  });

  const payload = (await response.json()) as TikTokApiResponse<CreatorInfo>;

  if (!response.ok || payload.error?.code !== "ok" || !payload.data) {
    return {
      ok: false,
      error: tikTokErrorMessage(payload.error, "Could not query TikTok creator info"),
    };
  }

  return { ok: true, info: payload.data };
}

async function initVideoPublish(options: {
  accessToken: string;
  caption: string;
  videoSize: number;
  creatorInfo: CreatorInfo;
  privacyLevel?: string;
}): Promise<
  | { ok: true; publishId: string; uploadUrl: string; privacyLevel: string }
  | { ok: false; error: string; retryWithSelfOnly?: boolean }
> {
  const privacyLevel =
    options.privacyLevel ??
    pickPrivacyLevel(options.creatorInfo.privacy_level_options);

  const response = await fetch(`${TIKTOK_API}/v2/post/publish/video/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: {
        title: options.caption.trim().slice(0, 2200),
        privacy_level: privacyLevel,
        disable_duet: options.creatorInfo.duet_disabled ?? false,
        disable_stitch: options.creatorInfo.stitch_disabled ?? false,
        disable_comment: options.creatorInfo.comment_disabled ?? false,
        brand_content_toggle: false,
        brand_organic_toggle: false,
        video_cover_timestamp_ms: 1000,
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: options.videoSize,
        chunk_size: options.videoSize,
        total_chunk_count: 1,
      },
    }),
  });

  const payload = (await response.json()) as TikTokApiResponse<{
    publish_id?: string;
    upload_url?: string;
  }>;

  if (
    !response.ok ||
    payload.error?.code !== "ok" ||
    !payload.data?.publish_id ||
    !payload.data.upload_url
  ) {
    return {
      ok: false,
      error: tikTokErrorMessage(payload.error, "TikTok video init failed"),
      retryWithSelfOnly: shouldRetryWithSelfOnly(payload.error),
    };
  }

  return {
    ok: true,
    publishId: payload.data.publish_id,
    uploadUrl: payload.data.upload_url,
    privacyLevel,
  };
}

async function uploadVideoChunk(
  uploadUrl: string,
  videoBytes: Buffer,
  contentType: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const videoSize = videoBytes.length;
  const uploadContentType = normalizeVideoContentType(contentType);

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": uploadContentType,
      "Content-Length": String(videoSize),
      "Content-Range": `bytes 0-${videoSize - 1}/${videoSize}`,
    },
    body: new Uint8Array(videoBytes),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return {
      ok: false,
      error: text.trim() || `TikTok video upload failed (${response.status})`,
    };
  }

  return { ok: true };
}

async function waitForPublishComplete(
  accessToken: string,
  publishId: string,
): Promise<{ ok: true; postId: string } | { ok: false; error: string }> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    const response = await fetch(`${TIKTOK_API}/v2/post/publish/status/fetch/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ publish_id: publishId }),
    });

    const payload = (await response.json()) as TikTokApiResponse<PublishStatus>;

    if (!response.ok || payload.error?.code !== "ok") {
      return {
        ok: false,
        error: tikTokErrorMessage(payload.error, "TikTok publish status check failed"),
      };
    }

    const status = payload.data?.status;

    if (status === "PUBLISH_COMPLETE") {
      const postId = payload.data?.publicaly_available_post_id?.[0] ?? publishId;
      return { ok: true, postId };
    }

    if (status === "FAILED") {
      const reason = payload.data?.fail_reason ?? "unknown";
      return { ok: false, error: `TikTok publish failed (${reason})` };
    }

    if (attempt < MAX_POLL_ATTEMPTS - 1) {
      await sleep(POLL_DELAY_MS);
    }
  }

  return { ok: false, error: "TikTok publish timed out while processing" };
}

async function initPhotoPublish(options: {
  accessToken: string;
  caption: string;
  imageUrl: string;
  creatorInfo: CreatorInfo;
  privacyLevel?: string;
}): Promise<
  | { ok: true; publishId: string; privacyLevel: string }
  | { ok: false; error: string; retryWithSelfOnly?: boolean }
> {
  const privacyLevel =
    options.privacyLevel ??
    pickPrivacyLevel(options.creatorInfo.privacy_level_options);
  const trimmedCaption = options.caption.trim();

  const response = await fetch(`${TIKTOK_API}/v2/post/publish/content/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: {
        title: trimmedCaption.slice(0, 90),
        description: trimmedCaption.slice(0, 4000),
        privacy_level: privacyLevel,
        disable_comment: options.creatorInfo.comment_disabled ?? false,
        brand_content_toggle: false,
        brand_organic_toggle: false,
        auto_add_music: true,
      },
      source_info: {
        source: "PULL_FROM_URL",
        photo_cover_index: 0,
        photo_images: [options.imageUrl],
      },
      post_mode: "DIRECT_POST",
      media_type: "PHOTO",
    }),
  });

  const payload = (await response.json()) as TikTokApiResponse<{
    publish_id?: string;
  }>;

  if (!response.ok || payload.error?.code !== "ok" || !payload.data?.publish_id) {
    return {
      ok: false,
      error: tikTokErrorMessage(payload.error, "TikTok photo init failed"),
      retryWithSelfOnly: shouldRetryWithSelfOnly(payload.error),
    };
  }

  return {
    ok: true,
    publishId: payload.data.publish_id,
    privacyLevel,
  };
}

function useTikTokPhotoPullFromUrl(): boolean {
  return process.env.TIKTOK_PHOTO_PULL_FROM_URL?.trim().toLowerCase() === "true";
}

async function publishPhotoWithAccessToken(options: {
  accessToken: string;
  caption: string;
  imageUrl: string;
}): Promise<
  | { ok: true; postId: string; detail?: string }
  | { ok: false; error: string }
> {
  if (useTikTokPhotoPullFromUrl()) {
    return publishPhotoPullFromUrl(options);
  }

  return publishPhotoAsVideoUpload(options);
}

async function publishPhotoPullFromUrl(options: {
  accessToken: string;
  caption: string;
  imageUrl: string;
}): Promise<
  | { ok: true; postId: string; detail?: string }
  | { ok: false; error: string }
> {
  const creator = await queryCreatorInfo(options.accessToken);
  if (!creator.ok) {
    return creator;
  }

  let init = await initPhotoPublish({
    accessToken: options.accessToken,
    caption: options.caption,
    imageUrl: options.imageUrl,
    creatorInfo: creator.info,
  });

  if (!init.ok && init.retryWithSelfOnly) {
    init = await initPhotoPublish({
      accessToken: options.accessToken,
      caption: options.caption,
      imageUrl: options.imageUrl,
      creatorInfo: creator.info,
      privacyLevel: "SELF_ONLY",
    });
  }

  if (!init.ok) {
    return { ok: false, error: init.error };
  }

  const published = await waitForPublishComplete(options.accessToken, init.publishId);
  if (!published.ok) {
    return published;
  }

  const detail =
    init.privacyLevel === "SELF_ONLY"
      ? "poză privată pe TikTok (Sandbox / fără audit) — vezi în profilul tău"
      : "poză pe TikTok (Photo Mode)";

  return { ok: true, postId: published.postId, detail };
}

async function publishPhotoAsVideoUpload(options: {
  accessToken: string;
  caption: string;
  imageUrl: string;
}): Promise<
  | { ok: true; postId: string; detail?: string }
  | { ok: false; error: string }
> {
  const imageResponse = await fetch(options.imageUrl);
  if (!imageResponse.ok) {
    return { ok: false, error: "Could not download image for TikTok upload" };
  }

  const imageBytes = Buffer.from(await imageResponse.arrayBuffer());
  const contentType = imageResponse.headers.get("content-type") ?? "image/jpeg";

  let videoBytes: Buffer;
  try {
    videoBytes = await convertImageToVideoBytes(imageBytes, contentType);
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not prepare image for TikTok upload",
    };
  }

  const published = await publishWithAccessToken({
    accessToken: options.accessToken,
    caption: options.caption,
    videoBytes,
    contentType: "video/mp4",
  });

  if (!published.ok) {
    return published;
  }

  const detail =
    published.detail?.includes("privat")
      ? "poză ca video privat pe TikTok (Sandbox) — vezi în profilul tău"
      : "poză publicată ca video scurt pe TikTok";

  return { ok: true, postId: published.postId, detail };
}

async function publishWithAccessToken(options: {
  accessToken: string;
  caption: string;
  videoBytes: Buffer;
  contentType: string;
}): Promise<
  | { ok: true; postId: string; detail?: string }
  | { ok: false; error: string }
> {
  const creator = await queryCreatorInfo(options.accessToken);
  if (!creator.ok) {
    return creator;
  }

  let init = await initVideoPublish({
    accessToken: options.accessToken,
    caption: options.caption,
    videoSize: options.videoBytes.length,
    creatorInfo: creator.info,
  });

  if (!init.ok && init.retryWithSelfOnly) {
    init = await initVideoPublish({
      accessToken: options.accessToken,
      caption: options.caption,
      videoSize: options.videoBytes.length,
      creatorInfo: creator.info,
      privacyLevel: "SELF_ONLY",
    });
  }

  if (!init.ok) {
    return { ok: false, error: init.error };
  }

  const upload = await uploadVideoChunk(
    init.uploadUrl,
    options.videoBytes,
    options.contentType,
  );

  if (!upload.ok) {
    return upload;
  }

  const published = await waitForPublishComplete(options.accessToken, init.publishId);
  if (!published.ok) {
    return published;
  }

  const detail =
    init.privacyLevel === "SELF_ONLY"
      ? "privat pe TikTok (app în Sandbox / fără audit) — vezi în profilul tău"
      : "live pe TikTok";

  return { ok: true, postId: published.postId, detail };
}

export async function publishTikTokPhoto(options: {
  accessToken: string;
  refreshToken?: string | null;
  caption: string;
  imageUrl: string;
}): Promise<
  | { ok: true; postId: string; detail?: string }
  | { ok: false; error: string }
> {
  try {
    let accessToken = options.accessToken;
    let result = await publishPhotoWithAccessToken({
      accessToken,
      caption: options.caption,
      imageUrl: options.imageUrl,
    });

    const shouldRefresh =
      !result.ok &&
      options.refreshToken &&
      /access_token_invalid|access token expired|401/i.test(result.error);

    if (shouldRefresh && options.refreshToken) {
      const refreshed = await refreshTikTokAccessToken(options.refreshToken);
      accessToken = refreshed.accessToken;
      result = await publishPhotoWithAccessToken({
        accessToken,
        caption: options.caption,
        imageUrl: options.imageUrl,
      });
    }

    return result.ok
      ? { ok: true, postId: result.postId, detail: result.detail }
      : { ok: false, error: result.error };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function publishTikTokContent(options: {
  accessToken: string;
  refreshToken?: string | null;
  caption: string;
  mediaType: "image" | "video";
  imageUrl?: string | null;
  videoBytes?: Buffer;
  contentType?: string;
  storyRequested?: boolean;
}): Promise<
  | { ok: true; postId: string; detail?: string }
  | { ok: false; error: string }
> {
  if (options.storyRequested) {
    return {
      ok: false,
      error:
        "TikTok API nu suportă Story — doar video sau poză (Photo Mode) în feed",
    };
  }

  if (options.mediaType === "video") {
    if (!options.videoBytes?.length) {
      return { ok: false, error: "tiktok needs a video attached with 📎" };
    }

    return publishTikTokVideo({
      accessToken: options.accessToken,
      refreshToken: options.refreshToken,
      caption: options.caption,
      videoBytes: options.videoBytes,
      contentType: options.contentType ?? "video/mp4",
    });
  }

  if (!options.imageUrl) {
    return { ok: false, error: "tiktok needs a photo attached with 📎 (JPEG/WebP)" };
  }

  return publishTikTokPhoto({
    accessToken: options.accessToken,
    refreshToken: options.refreshToken,
    caption: options.caption,
    imageUrl: options.imageUrl,
  });
}

/** @deprecated use publishTikTokContent */
export async function publishTikTokVideo(options: {
  accessToken: string;
  refreshToken?: string | null;
  caption: string;
  videoBytes: Buffer;
  contentType: string;
}): Promise<
  | { ok: true; postId: string; detail?: string }
  | { ok: false; error: string }
> {
  try {
    let accessToken = options.accessToken;
    let result = await publishWithAccessToken({
      accessToken,
      caption: options.caption,
      videoBytes: options.videoBytes,
      contentType: options.contentType,
    });

    const shouldRefresh =
      !result.ok &&
      options.refreshToken &&
      /access_token_invalid|access token expired|401/i.test(result.error);

    if (shouldRefresh && options.refreshToken) {
      const refreshed = await refreshTikTokAccessToken(options.refreshToken);
      accessToken = refreshed.accessToken;
      result = await publishWithAccessToken({
        accessToken,
        caption: options.caption,
        videoBytes: options.videoBytes,
        contentType: options.contentType,
      });
    }

    return result.ok
      ? { ok: true, postId: result.postId, detail: result.detail }
      : { ok: false, error: result.error };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

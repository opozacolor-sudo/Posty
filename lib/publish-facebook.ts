const GRAPH_API = "https://graph.facebook.com/v21.0";

type GraphError = {
  error?: { message?: string };
  id?: string;
  post_id?: string;
  success?: boolean;
  video_id?: string;
  upload_url?: string;
};

export type FacebookPublishFormat = "feed" | "story" | "reel";

export function detectFacebookPublishFormat(text: string): FacebookPublishFormat {
  if (/\b(?:fb|facebook)\s+(?:story|stories|povest)\b/i.test(text)) {
    return "story";
  }

  if (/\b(?:fb|facebook)\s+reels?\b/i.test(text)) {
    return "reel";
  }

  return "feed";
}

async function resolveFacebookPageId(
  accessToken: string,
  storedPageId?: string,
): Promise<string> {
  if (storedPageId) {
    return storedPageId;
  }

  const params = new URLSearchParams({
    fields: "id",
    access_token: accessToken,
  });

  const response = await fetch(`${GRAPH_API}/me?${params.toString()}`);
  const data = (await response.json()) as GraphError & { id?: string };

  if (!response.ok || !data.id) {
    throw new Error(data.error?.message ?? "Could not resolve Facebook Page id");
  }

  return data.id;
}

function graphErrorMessage(
  data: GraphError,
  fallback: string,
): string {
  return data.error?.message ?? fallback;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForFacebookVideoReady(options: {
  videoId: string;
  accessToken: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const maxAttempts = 30;
  const delayMs = 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const params = new URLSearchParams({
      fields: "status",
      access_token: options.accessToken,
    });

    const response = await fetch(`${GRAPH_API}/${options.videoId}?${params.toString()}`);
    const data = (await response.json()) as GraphError & {
      status?: {
        uploading_phase?: { status?: string };
        processing_phase?: { status?: string };
      };
    };

    if (!response.ok) {
      return {
        ok: false,
        error: graphErrorMessage(data, "Facebook video status check failed"),
      };
    }

    const uploadStatus = data.status?.uploading_phase?.status;
    const processingStatus = data.status?.processing_phase?.status;

    if (
      uploadStatus === "complete" &&
      (processingStatus === "complete" ||
        processingStatus === "not_started" ||
        !processingStatus)
    ) {
      return { ok: true };
    }

    if (uploadStatus === "error" || processingStatus === "error") {
      return {
        ok: false,
        error: "Facebook video processing failed before publish",
      };
    }

    if (attempt < maxAttempts - 1) {
      await sleep(delayMs);
    }
  }

  return {
    ok: false,
    error: "Facebook video upload timed out — try again in a moment",
  };
}

async function startFacebookVideoSession(options: {
  pageId: string;
  accessToken: string;
  edge: "video_reels" | "video_stories";
}): Promise<
  | { ok: true; videoId: string; uploadUrl: string }
  | { ok: false; error: string }
> {
  const body = new URLSearchParams({
    upload_phase: "start",
    access_token: options.accessToken,
  });

  const response = await fetch(
    `${GRAPH_API}/${options.pageId}/${options.edge}`,
    { method: "POST", body },
  );
  const data = (await response.json()) as GraphError;

  if (!response.ok || !data.video_id || !data.upload_url) {
    return {
      ok: false,
      error: graphErrorMessage(data, "Facebook video upload init failed"),
    };
  }

  return {
    ok: true,
    videoId: data.video_id,
    uploadUrl: data.upload_url,
  };
}

async function uploadFacebookHostedVideo(options: {
  uploadUrl: string;
  accessToken: string;
  videoUrl: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(options.uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${options.accessToken}`,
      file_url: options.videoUrl,
    },
  });

  let data: GraphError = {};
  try {
    data = (await response.json()) as GraphError;
  } catch {
    data = {};
  }

  if (!response.ok) {
    const text = data.error?.message ?? (await response.text().catch(() => ""));
    return {
      ok: false,
      error: text.trim() || `Facebook video upload failed (${response.status})`,
    };
  }

  return { ok: true };
}

async function finishFacebookVideoSession(options: {
  pageId: string;
  accessToken: string;
  videoId: string;
  edge: "video_reels" | "video_stories";
  caption?: string;
}): Promise<{ ok: true; postId: string } | { ok: false; error: string }> {
  const body = new URLSearchParams({
    upload_phase: "finish",
    video_id: options.videoId,
    access_token: options.accessToken,
  });

  if (options.edge === "video_reels") {
    body.set("video_state", "PUBLISHED");
    if (options.caption?.trim()) {
      body.set("description", options.caption.trim().slice(0, 63206));
    }
  }

  const response = await fetch(
    `${GRAPH_API}/${options.pageId}/${options.edge}`,
    { method: "POST", body },
  );
  const data = (await response.json()) as GraphError;

  if (!response.ok || data.success !== true) {
    return {
      ok: false,
      error: graphErrorMessage(data, "Facebook video publish failed"),
    };
  }

  return { ok: true, postId: data.post_id ?? options.videoId };
}

async function publishFacebookResumableVideo(options: {
  accessToken: string;
  pageId?: string;
  caption: string;
  videoUrl: string;
  edge: "video_reels" | "video_stories";
}): Promise<{ ok: true; postId: string } | { ok: false; error: string }> {
  try {
    const pageId = await resolveFacebookPageId(options.accessToken, options.pageId);
    const session = await startFacebookVideoSession({
      pageId,
      accessToken: options.accessToken,
      edge: options.edge,
    });

    if (!session.ok) {
      return session;
    }

    const upload = await uploadFacebookHostedVideo({
      uploadUrl: session.uploadUrl,
      accessToken: options.accessToken,
      videoUrl: options.videoUrl,
    });

    if (!upload.ok) {
      return upload;
    }

    if (options.edge === "video_stories") {
      const ready = await waitForFacebookVideoReady({
        videoId: session.videoId,
        accessToken: options.accessToken,
      });

      if (!ready.ok) {
        return ready;
      }
    }

    return finishFacebookVideoSession({
      pageId,
      accessToken: options.accessToken,
      videoId: session.videoId,
      edge: options.edge,
      caption: options.caption,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function publishFacebookPhotoPost(options: {
  accessToken: string;
  pageId?: string;
  caption: string;
  imageUrl: string;
}): Promise<{ ok: true; postId: string } | { ok: false; error: string }> {
  try {
    const pageId = await resolveFacebookPageId(options.accessToken, options.pageId);

    const body = new URLSearchParams({
      url: options.imageUrl,
      message: options.caption,
      access_token: options.accessToken,
    });

    const response = await fetch(`${GRAPH_API}/${pageId}/photos`, {
      method: "POST",
      body,
    });
    const data = (await response.json()) as GraphError;

    if (!response.ok || !data.id) {
      return {
        ok: false,
        error: graphErrorMessage(data, "Facebook photo publish failed"),
      };
    }

    return { ok: true, postId: data.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function publishFacebookPhotoStory(options: {
  accessToken: string;
  pageId?: string;
  imageUrl: string;
}): Promise<{ ok: true; postId: string } | { ok: false; error: string }> {
  try {
    const pageId = await resolveFacebookPageId(options.accessToken, options.pageId);

    const uploadBody = new URLSearchParams({
      url: options.imageUrl,
      published: "false",
      access_token: options.accessToken,
    });

    const uploadResponse = await fetch(`${GRAPH_API}/${pageId}/photos`, {
      method: "POST",
      body: uploadBody,
    });
    const uploaded = (await uploadResponse.json()) as GraphError;

    if (!uploadResponse.ok || !uploaded.id) {
      return {
        ok: false,
        error: graphErrorMessage(uploaded, "Facebook story photo upload failed"),
      };
    }

    const storyBody = new URLSearchParams({
      photo_id: uploaded.id,
      access_token: options.accessToken,
    });

    const storyResponse = await fetch(`${GRAPH_API}/${pageId}/photo_stories`, {
      method: "POST",
      body: storyBody,
    });
    const story = (await storyResponse.json()) as GraphError;

    if (!storyResponse.ok || story.success !== true) {
      return {
        ok: false,
        error: graphErrorMessage(story, "Facebook photo story publish failed"),
      };
    }

    return { ok: true, postId: story.post_id ?? uploaded.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function publishFacebookVideoPost(options: {
  accessToken: string;
  pageId?: string;
  caption: string;
  videoUrl: string;
}): Promise<{ ok: true; postId: string } | { ok: false; error: string }> {
  try {
    const pageId = await resolveFacebookPageId(options.accessToken, options.pageId);

    const body = new URLSearchParams({
      file_url: options.videoUrl,
      description: options.caption.trim().slice(0, 63206),
      published: "true",
      access_token: options.accessToken,
    });

    const response = await fetch(`${GRAPH_API}/${pageId}/videos`, {
      method: "POST",
      body,
    });
    const data = (await response.json()) as GraphError;

    if (!response.ok || !data.id) {
      return {
        ok: false,
        error: graphErrorMessage(data, "Facebook video publish failed"),
      };
    }

    return { ok: true, postId: data.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function publishFacebookVideoStory(options: {
  accessToken: string;
  pageId?: string;
  videoUrl: string;
}): Promise<{ ok: true; postId: string } | { ok: false; error: string }> {
  return publishFacebookResumableVideo({
    accessToken: options.accessToken,
    pageId: options.pageId,
    caption: "",
    videoUrl: options.videoUrl,
    edge: "video_stories",
  });
}

export async function publishFacebookReel(options: {
  accessToken: string;
  pageId?: string;
  caption: string;
  videoUrl: string;
}): Promise<{ ok: true; postId: string } | { ok: false; error: string }> {
  return publishFacebookResumableVideo({
    accessToken: options.accessToken,
    pageId: options.pageId,
    caption: options.caption,
    videoUrl: options.videoUrl,
    edge: "video_reels",
  });
}

export async function publishFacebookContent(options: {
  accessToken: string;
  pageId?: string;
  caption: string;
  format: FacebookPublishFormat;
  mediaType: "image" | "video";
  imageUrl?: string | null;
  videoUrl?: string | null;
}): Promise<{ ok: true; postId: string; detail?: string } | { ok: false; error: string }> {
  const { format, mediaType, caption, imageUrl, videoUrl } = options;

  if (format === "story") {
    if (mediaType === "video") {
      if (!videoUrl) {
        return { ok: false, error: "facebook story needs a video attached with 📎" };
      }

      const result = await publishFacebookVideoStory({
        accessToken: options.accessToken,
        pageId: options.pageId,
        videoUrl,
      });

      return result.ok
        ? { ok: true, postId: result.postId, detail: "story video pe Facebook" }
        : result;
    }

    if (!imageUrl) {
      return { ok: false, error: "facebook story needs a photo attached with 📎" };
    }

    const result = await publishFacebookPhotoStory({
      accessToken: options.accessToken,
      pageId: options.pageId,
      imageUrl,
    });

    return result.ok
      ? { ok: true, postId: result.postId, detail: "story poză pe Facebook" }
      : result;
  }

  if (format === "reel") {
    if (mediaType !== "video" || !videoUrl) {
      return { ok: false, error: "facebook reel needs a video attached with 📎" };
    }

    const result = await publishFacebookReel({
      accessToken: options.accessToken,
      pageId: options.pageId,
      caption,
      videoUrl,
    });

    return result.ok
      ? { ok: true, postId: result.postId, detail: "reel pe Facebook" }
      : result;
  }

  if (mediaType === "video") {
    if (!videoUrl) {
      return { ok: false, error: "facebook needs a video attached with 📎" };
    }

    const result = await publishFacebookVideoPost({
      accessToken: options.accessToken,
      pageId: options.pageId,
      caption,
      videoUrl,
    });

    return result.ok ? { ok: true, postId: result.postId } : result;
  }

  if (!imageUrl) {
    return { ok: false, error: "facebook needs a photo attached with 📎" };
  }

  const result = await publishFacebookPhotoPost({
    accessToken: options.accessToken,
    pageId: options.pageId,
    caption,
    imageUrl,
  });

  return result.ok ? { ok: true, postId: result.postId } : result;
}

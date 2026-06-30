type GraphError = {
  error?: { message?: string };
  id?: string;
};

export type InstagramPublishFormat = "feed" | "story" | "reel";

export function detectInstagramPublishFormat(text: string): InstagramPublishFormat {
  if (/\b(story|stories|povest)\b/i.test(text)) {
    return "story";
  }

  if (/\b(reel|reels)\b/i.test(text)) {
    return "reel";
  }

  return "feed";
}

async function resolveInstagramUserId(accessToken: string): Promise<string> {
  const params = new URLSearchParams({
    fields: "id,user_id",
    access_token: accessToken,
  });

  const response = await fetch(`https://graph.instagram.com/v21.0/me?${params.toString()}`);
  const data = (await response.json()) as GraphError & {
    user_id?: string;
    id?: string;
  };

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Could not resolve Instagram user id");
  }

  const userId = data.user_id ?? data.id;
  if (!userId) {
    throw new Error("Instagram user id missing from profile response");
  }

  return String(userId);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function graphErrorMessage(data: GraphError, fallback: string): string {
  return data.error?.message ?? fallback;
}

async function waitForInstagramContainerReady(
  containerId: string,
  accessToken: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const maxAttempts = 30;
  const delayMs = 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const params = new URLSearchParams({
      fields: "status_code,status",
      access_token: accessToken,
    });

    const response = await fetch(
      `https://graph.instagram.com/v21.0/${containerId}?${params.toString()}`,
    );
    const data = (await response.json()) as GraphError & {
      status_code?: string;
      status?: string;
    };

    if (!response.ok) {
      return {
        ok: false,
        error: graphErrorMessage(data, "Instagram container status check failed"),
      };
    }

    const statusCode = data.status_code;
    if (statusCode === "FINISHED") {
      return { ok: true };
    }

    if (statusCode === "ERROR" || statusCode === "EXPIRED") {
      return {
        ok: false,
        error: data.status ?? `Instagram container ${statusCode}`,
      };
    }

    if (attempt < maxAttempts - 1) {
      await sleep(delayMs);
    }
  }

  return {
    ok: false,
    error: "Instagram media processing timed out — try again in a moment",
  };
}

async function publishInstagramContainer(options: {
  accessToken: string;
  userId: string;
  containerBody: URLSearchParams;
}): Promise<{ ok: true; postId: string } | { ok: false; error: string }> {
  const containerResponse = await fetch(
    `https://graph.instagram.com/v21.0/${options.userId}/media`,
    { method: "POST", body: options.containerBody },
  );
  const container = (await containerResponse.json()) as GraphError;

  if (!containerResponse.ok || !container.id) {
    return {
      ok: false,
      error: graphErrorMessage(container, "Instagram media container failed"),
    };
  }

  const ready = await waitForInstagramContainerReady(container.id, options.accessToken);
  if (!ready.ok) {
    return ready;
  }

  const publishBody = new URLSearchParams({
    creation_id: container.id,
    access_token: options.accessToken,
  });

  const publishResponse = await fetch(
    `https://graph.instagram.com/v21.0/${options.userId}/media_publish`,
    { method: "POST", body: publishBody },
  );
  const published = (await publishResponse.json()) as GraphError;

  if (!publishResponse.ok || !published.id) {
    return {
      ok: false,
      error: graphErrorMessage(published, "Instagram publish failed"),
    };
  }

  return { ok: true, postId: published.id };
}

export async function publishInstagramContent(options: {
  accessToken: string;
  caption: string;
  format: InstagramPublishFormat;
  mediaType: "image" | "video";
  imageUrl?: string | null;
  videoUrl?: string | null;
}): Promise<{ ok: true; postId: string; detail?: string } | { ok: false; error: string }> {
  try {
    const userId = await resolveInstagramUserId(options.accessToken);
    const { format, mediaType, caption, imageUrl, videoUrl } = options;

    if (format === "story") {
      const containerBody = new URLSearchParams({
        media_type: "STORIES",
        access_token: options.accessToken,
      });

      if (mediaType === "video") {
        if (!videoUrl) {
          return { ok: false, error: "instagram story needs a video attached with 📎" };
        }
        containerBody.set("video_url", videoUrl);
      } else {
        if (!imageUrl) {
          return { ok: false, error: "instagram story needs a photo attached with 📎" };
        }
        containerBody.set("image_url", imageUrl);
      }

      const result = await publishInstagramContainer({
        accessToken: options.accessToken,
        userId,
        containerBody,
      });

      return result.ok
        ? { ok: true, postId: result.postId, detail: "story pe Instagram" }
        : result;
    }

    if (format === "reel") {
      if (mediaType !== "video" || !videoUrl) {
        return { ok: false, error: "instagram reel needs a video attached with 📎" };
      }

      const containerBody = new URLSearchParams({
        media_type: "REELS",
        video_url: videoUrl,
        caption,
        share_to_feed: "false",
        access_token: options.accessToken,
      });

      const result = await publishInstagramContainer({
        accessToken: options.accessToken,
        userId,
        containerBody,
      });

      return result.ok
        ? { ok: true, postId: result.postId, detail: "reel pe Instagram" }
        : result;
    }

    if (mediaType === "video") {
      if (!videoUrl) {
        return { ok: false, error: "instagram needs a video attached with 📎" };
      }

      const containerBody = new URLSearchParams({
        media_type: "REELS",
        video_url: videoUrl,
        caption,
        share_to_feed: "true",
        access_token: options.accessToken,
      });

      const result = await publishInstagramContainer({
        accessToken: options.accessToken,
        userId,
        containerBody,
      });

      return result.ok
        ? { ok: true, postId: result.postId, detail: "video pe Instagram" }
        : result;
    }

    if (!imageUrl) {
      return { ok: false, error: "instagram needs a photo attached with 📎" };
    }

    const containerBody = new URLSearchParams({
      image_url: imageUrl,
      caption,
      access_token: options.accessToken,
    });

    const result = await publishInstagramContainer({
      accessToken: options.accessToken,
      userId,
      containerBody,
    });

    return result.ok ? { ok: true, postId: result.postId } : result;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** @deprecated use publishInstagramContent */
export async function publishInstagramPost(options: {
  accessToken: string;
  caption: string;
  imageUrl: string;
}): Promise<{ ok: true; postId: string } | { ok: false; error: string }> {
  const result = await publishInstagramContent({
    accessToken: options.accessToken,
    caption: options.caption,
    format: "feed",
    mediaType: "image",
    imageUrl: options.imageUrl,
  });

  return result.ok
    ? { ok: true, postId: result.postId }
    : { ok: false, error: result.error };
}

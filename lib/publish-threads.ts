type GraphError = {
  error?: { message?: string };
  id?: string;
};

async function resolveThreadsUserId(accessToken: string): Promise<string> {
  const params = new URLSearchParams({
    fields: "id",
    access_token: accessToken,
  });

  const response = await fetch(`https://graph.threads.net/me?${params.toString()}`);
  const data = (await response.json()) as GraphError & { id?: string };

  if (!response.ok || !data.id) {
    throw new Error(data.error?.message ?? "Could not resolve Threads user id");
  }

  return String(data.id);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function graphErrorMessage(data: GraphError, fallback: string): string {
  return data.error?.message ?? fallback;
}

async function waitForThreadsContainerReady(
  containerId: string,
  accessToken: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const maxAttempts = 30;
  const delayMs = 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const params = new URLSearchParams({
      fields: "status,error_message",
      access_token: accessToken,
    });

    const response = await fetch(
      `https://graph.threads.net/v1.0/${containerId}?${params.toString()}`,
    );
    const data = (await response.json()) as GraphError & {
      status?: string;
      error_message?: string;
    };

    if (!response.ok) {
      return {
        ok: false,
        error: graphErrorMessage(data, "Threads container status check failed"),
      };
    }

    const status = data.status;
    if (status === "FINISHED") {
      return { ok: true };
    }

    if (status === "ERROR" || status === "EXPIRED") {
      return {
        ok: false,
        error: data.error_message ?? `Threads container ${status}`,
      };
    }

    if (attempt < maxAttempts - 1) {
      await sleep(delayMs);
    }
  }

  return {
    ok: false,
    error: "Threads video processing timed out — try again in a moment",
  };
}

async function publishThreadsContainer(options: {
  accessToken: string;
  userId: string;
  containerBody: URLSearchParams;
  waitForProcessing: boolean;
}): Promise<{ ok: true; postId: string } | { ok: false; error: string }> {
  const containerResponse = await fetch(
    `https://graph.threads.net/v1.0/${options.userId}/threads`,
    { method: "POST", body: options.containerBody },
  );
  const container = (await containerResponse.json()) as GraphError;

  if (!containerResponse.ok || !container.id) {
    return {
      ok: false,
      error: graphErrorMessage(container, "Threads container failed"),
    };
  }

  if (options.waitForProcessing) {
    const ready = await waitForThreadsContainerReady(container.id, options.accessToken);
    if (!ready.ok) {
      return ready;
    }
  }

  const publishBody = new URLSearchParams({
    creation_id: container.id,
    access_token: options.accessToken,
  });

  const publishResponse = await fetch(
    `https://graph.threads.net/v1.0/${options.userId}/threads_publish`,
    { method: "POST", body: publishBody },
  );
  const published = (await publishResponse.json()) as GraphError;

  if (!publishResponse.ok || !published.id) {
    return {
      ok: false,
      error: graphErrorMessage(published, "Threads publish failed"),
    };
  }

  return { ok: true, postId: published.id };
}

export async function publishThreadsPost(options: {
  accessToken: string;
  caption: string;
  mediaType?: "image" | "video" | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
}): Promise<{ ok: true; postId: string; detail?: string } | { ok: false; error: string }> {
  try {
    const userId = await resolveThreadsUserId(options.accessToken);
    const { caption, imageUrl, videoUrl } = options;
    const mediaType = options.mediaType ?? (videoUrl ? "video" : imageUrl ? "image" : null);

    if (mediaType === "video") {
      if (!videoUrl) {
        return { ok: false, error: "threads needs a video attached with 📎" };
      }

      const containerBody = new URLSearchParams({
        media_type: "VIDEO",
        video_url: videoUrl,
        text: caption,
        access_token: options.accessToken,
      });

      const result = await publishThreadsContainer({
        accessToken: options.accessToken,
        userId,
        containerBody,
        waitForProcessing: true,
      });

      return result.ok
        ? { ok: true, postId: result.postId, detail: "video pe Threads" }
        : result;
    }

    if (mediaType === "image" || imageUrl) {
      if (!imageUrl) {
        return { ok: false, error: "threads needs a photo attached with 📎" };
      }

      const containerBody = new URLSearchParams({
        media_type: "IMAGE",
        image_url: imageUrl,
        text: caption,
        access_token: options.accessToken,
      });

      const result = await publishThreadsContainer({
        accessToken: options.accessToken,
        userId,
        containerBody,
        waitForProcessing: false,
      });

      return result.ok ? { ok: true, postId: result.postId } : result;
    }

    const containerBody = new URLSearchParams({
      media_type: "TEXT",
      text: caption,
      access_token: options.accessToken,
    });

    const result = await publishThreadsContainer({
      accessToken: options.accessToken,
      userId,
      containerBody,
      waitForProcessing: false,
    });

    return result.ok ? { ok: true, postId: result.postId } : result;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

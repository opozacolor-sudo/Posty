type GraphError = {
  error?: { message?: string };
  id?: string;
};

async function resolveInstagramUserId(accessToken: string): Promise<string> {
  const params = new URLSearchParams({
    fields: "id,user_id",
    access_token: accessToken,
  });

  const response = await fetch(`https://graph.instagram.com/me?${params.toString()}`);
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

async function waitForInstagramContainerReady(
  containerId: string,
  accessToken: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const maxAttempts = 20;
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
        error: data.error?.message ?? "Instagram container status check failed",
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
    error: "Instagram image processing timed out — try again in a moment",
  };
}

export async function publishInstagramPost(options: {
  accessToken: string;
  caption: string;
  imageUrl: string;
}): Promise<{ ok: true; postId: string } | { ok: false; error: string }> {
  try {
    const userId = await resolveInstagramUserId(options.accessToken);

    const containerBody = new URLSearchParams({
      image_url: options.imageUrl,
      caption: options.caption,
      access_token: options.accessToken,
    });

    const containerResponse = await fetch(
      `https://graph.instagram.com/v21.0/${userId}/media`,
      { method: "POST", body: containerBody },
    );
    const container = (await containerResponse.json()) as GraphError;

    if (!containerResponse.ok || !container.id) {
      return {
        ok: false,
        error: container.error?.message ?? "Instagram media container failed",
      };
    }

    const ready = await waitForInstagramContainerReady(
      container.id,
      options.accessToken,
    );
    if (!ready.ok) {
      return ready;
    }

    const publishBody = new URLSearchParams({
      creation_id: container.id,
      access_token: options.accessToken,
    });

    const publishResponse = await fetch(
      `https://graph.instagram.com/v21.0/${userId}/media_publish`,
      { method: "POST", body: publishBody },
    );
    const published = (await publishResponse.json()) as GraphError;

    if (!publishResponse.ok || !published.id) {
      return {
        ok: false,
        error: published.error?.message ?? "Instagram publish failed",
      };
    }

    return { ok: true, postId: published.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

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

export async function publishThreadsPost(options: {
  accessToken: string;
  caption: string;
  imageUrl?: string | null;
}): Promise<{ ok: true; postId: string } | { ok: false; error: string }> {
  try {
    const userId = await resolveThreadsUserId(options.accessToken);

    const containerBody = new URLSearchParams({
      access_token: options.accessToken,
    });

    if (options.imageUrl) {
      containerBody.set("media_type", "IMAGE");
      containerBody.set("image_url", options.imageUrl);
      containerBody.set("text", options.caption);
    } else {
      containerBody.set("media_type", "TEXT");
      containerBody.set("text", options.caption);
    }

    const containerResponse = await fetch(
      `https://graph.threads.net/v1.0/${userId}/threads`,
      { method: "POST", body: containerBody },
    );
    const container = (await containerResponse.json()) as GraphError;

    if (!containerResponse.ok || !container.id) {
      return {
        ok: false,
        error: container.error?.message ?? "Threads container failed",
      };
    }

    const publishBody = new URLSearchParams({
      creation_id: container.id,
      access_token: options.accessToken,
    });

    const publishResponse = await fetch(
      `https://graph.threads.net/v1.0/${userId}/threads_publish`,
      { method: "POST", body: publishBody },
    );
    const published = (await publishResponse.json()) as GraphError;

    if (!publishResponse.ok || !published.id) {
      return {
        ok: false,
        error: published.error?.message ?? "Threads publish failed",
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

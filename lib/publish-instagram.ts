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

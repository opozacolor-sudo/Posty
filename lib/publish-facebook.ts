type GraphError = {
  error?: { message?: string };
  id?: string;
};

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

  const response = await fetch(
    `https://graph.facebook.com/v21.0/me?${params.toString()}`,
  );
  const data = (await response.json()) as GraphError & { id?: string };

  if (!response.ok || !data.id) {
    throw new Error(data.error?.message ?? "Could not resolve Facebook Page id");
  }

  return data.id;
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

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/photos`,
      { method: "POST", body },
    );
    const data = (await response.json()) as GraphError;

    if (!response.ok || !data.id) {
      return {
        ok: false,
        error: data.error?.message ?? "Facebook photo publish failed",
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

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/videos`,
      { method: "POST", body },
    );
    const data = (await response.json()) as GraphError;

    if (!response.ok || !data.id) {
      return {
        ok: false,
        error: data.error?.message ?? "Facebook video publish failed",
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

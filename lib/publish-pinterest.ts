type PinterestError = {
  message?: string;
  code?: number;
};

async function resolvePinterestBoardId(
  accessToken: string,
  storedBoardId?: string,
): Promise<string> {
  if (storedBoardId) {
    return storedBoardId;
  }

  const response = await fetch(
    "https://api.pinterest.com/v5/boards?page_size=1",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  const data = (await response.json()) as {
    items?: Array<{ id?: string }>;
    message?: string;
  };

  const boardId = data.items?.[0]?.id;
  if (!response.ok || !boardId) {
    throw new Error(
      data.message ??
        "No Pinterest board found — reconnect with write scopes (PINTEREST_INCLUDE_WRITE_SCOPES=true)",
    );
  }

  return boardId;
}

export async function publishPinterestPin(options: {
  accessToken: string;
  boardId?: string;
  caption: string;
  imageUrl: string;
}): Promise<{ ok: true; postId: string } | { ok: false; error: string }> {
  try {
    const boardId = await resolvePinterestBoardId(
      options.accessToken,
      options.boardId,
    );

    const title = options.caption.split("\n")[0]?.slice(0, 100) || "Posty pin";

    const response = await fetch("https://api.pinterest.com/v5/pins", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        board_id: boardId,
        title,
        description: options.caption,
        media_source: {
          source_type: "image_url",
          url: options.imageUrl,
        },
      }),
    });

    const data = (await response.json()) as PinterestError & { id?: string };

    if (!response.ok || !data.id) {
      return {
        ok: false,
        error:
          data.message ??
          "Pinterest pin failed — reconnect with write scopes (PINTEREST_INCLUDE_WRITE_SCOPES=true)",
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

export async function fetchPinterestDefaultBoardId(
  accessToken: string,
): Promise<string | null> {
  try {
    return await resolvePinterestBoardId(accessToken);
  } catch {
    return null;
  }
}

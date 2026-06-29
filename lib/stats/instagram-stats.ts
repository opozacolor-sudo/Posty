import type { StatsFetchResult } from "./types";

type MediaItem = {
  like_count?: number;
  comments_count?: number;
  total_views_count?: number;
  timestamp?: string;
};

type MediaPage = {
  data?: MediaItem[];
  paging?: { next?: string };
  error?: { message?: string };
};

async function resolveInstagramUserId(accessToken: string): Promise<string> {
  const params = new URLSearchParams({
    fields: "id,user_id",
    access_token: accessToken,
  });

  const response = await fetch(`https://graph.instagram.com/me?${params.toString()}`);
  const data = (await response.json()) as {
    user_id?: string;
    id?: string;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Could not resolve Instagram user id");
  }

  const userId = data.user_id ?? data.id;
  if (!userId) {
    throw new Error("Instagram user id missing");
  }

  return String(userId);
}

export async function fetchInstagramStats(
  accessToken: string,
): Promise<StatsFetchResult> {
  try {
    const userId = await resolveInstagramUserId(accessToken);
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

    let url =
      `https://graph.instagram.com/v21.0/${userId}/media?` +
      new URLSearchParams({
        fields: "like_count,comments_count,total_views_count,timestamp",
        limit: "25",
        access_token: accessToken,
      }).toString();

    let views = 0;
    let likes = 0;
    let comments = 0;
    let itemCount = 0;

    while (url) {
      const response = await fetch(url);
      const page = (await response.json()) as MediaPage;

      if (!response.ok) {
        return {
          ok: false,
          error: page.error?.message ?? "Instagram media fetch failed",
        };
      }

      for (const item of page.data ?? []) {
        if (item.timestamp) {
          const postedAt = new Date(item.timestamp).getTime();
          if (postedAt < cutoff) {
            continue;
          }
        }

        itemCount += 1;
        likes += item.like_count ?? 0;
        comments += item.comments_count ?? 0;
        views += item.total_views_count ?? 0;
      }

      url = page.paging?.next ?? "";
    }

    if (itemCount === 0) {
      return {
        ok: true,
        stats: {
          platform: "instagram",
          views,
          likes,
          comments,
          source: "live",
        },
      };
    }

    return {
      ok: true,
      stats: {
        platform: "instagram",
        views,
        likes,
        comments,
        source: "live",
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

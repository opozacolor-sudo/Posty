import type { StatsFetchResult } from "./types";

type MediaItem = {
  id?: string;
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

    const params = new URLSearchParams({
      fields: "id,like_count,comments_count,total_views_count,timestamp",
      limit: "1",
      access_token: accessToken,
    });

    const response = await fetch(
      `https://graph.instagram.com/v21.0/${userId}/media?${params.toString()}`,
    );
    const page = (await response.json()) as MediaPage;

    if (!response.ok) {
      return {
        ok: false,
        error: page.error?.message ?? "Instagram media fetch failed",
      };
    }

    const latest = page.data?.[0];
    if (!latest) {
      return {
        ok: true,
        stats: {
          platform: "instagram",
          views: 0,
          likes: 0,
          comments: 0,
          source: "live",
        },
      };
    }

    return {
      ok: true,
      stats: {
        platform: "instagram",
        views: latest.total_views_count ?? 0,
        likes: latest.like_count ?? 0,
        comments: latest.comments_count ?? 0,
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

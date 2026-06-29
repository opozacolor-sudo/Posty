import type { StatsFetchResult } from "./types";

type TikTokVideo = {
  view_count?: number;
  like_count?: number;
  comment_count?: number;
};

type TikTokVideoListResponse = {
  data?: { videos?: TikTokVideo[] };
  error?: { message?: string; code?: string };
};

type TikTokUserInfoResponse = {
  data?: {
    user?: {
      likes_count?: number;
      video_count?: number;
      follower_count?: number;
    };
  };
  error?: { message?: string; code?: string };
};

export async function fetchTikTokStats(
  accessToken: string,
): Promise<StatsFetchResult> {
  try {
    const videoResponse = await fetch(
      "https://open.tiktokapis.com/v2/video/list/?fields=id,view_count,like_count,comment_count",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ max_count: 1 }),
      },
    );
    const videoData = (await videoResponse.json()) as TikTokVideoListResponse;

    if (videoResponse.ok && videoData.data?.videos?.[0]) {
      const latest = videoData.data.videos[0];
      return {
        ok: true,
        stats: {
          platform: "tiktok",
          views: latest.view_count ?? 0,
          likes: latest.like_count ?? 0,
          comments: latest.comment_count ?? 0,
          source: "live",
        },
      };
    }

    const userResponse = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=likes_count,video_count,follower_count",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const userData = (await userResponse.json()) as TikTokUserInfoResponse;

    if (!userResponse.ok || !userData.data?.user) {
      return {
        ok: false,
        error:
          userData.error?.message ??
          videoData.error?.message ??
          "TikTok stats unavailable — reconnect with stats scopes",
      };
    }

    const user = userData.data.user;

    return {
      ok: true,
      stats: {
        platform: "tiktok",
        views: 0,
        likes: user.likes_count ?? 0,
        comments: 0,
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

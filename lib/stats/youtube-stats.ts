import type { StatsFetchResult } from "./types";

type YouTubeChannelResponse = {
  items?: Array<{
    statistics?: {
      viewCount?: string;
      commentCount?: string;
      videoCount?: string;
    };
  }>;
  error?: { message?: string };
};

type YouTubeVideoItem = {
  id?: string;
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
};

type YouTubeVideosResponse = {
  items?: YouTubeVideoItem[];
  error?: { message?: string };
};

export async function fetchYouTubeStats(
  accessToken: string,
): Promise<StatsFetchResult> {
  try {
    const channelResponse = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?" +
        new URLSearchParams({ part: "statistics", mine: "true" }),
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const channelData = (await channelResponse.json()) as YouTubeChannelResponse;

    if (!channelResponse.ok) {
      return {
        ok: false,
        error: channelData.error?.message ?? "YouTube channel fetch failed",
      };
    }

    const channelStats = channelData.items?.[0]?.statistics;
    const views = Number(channelStats?.viewCount ?? 0);

    const uploadsResponse = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?" +
        new URLSearchParams({ part: "contentDetails", mine: "true" }),
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const uploadsData = (await uploadsResponse.json()) as {
      items?: Array<{ contentDetails?: { relatedPlaylists?: { uploads?: string } } }>;
    };

    const uploadsPlaylistId =
      uploadsData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    let likes = 0;
    let comments = Number(channelStats?.commentCount ?? 0);

    if (uploadsPlaylistId) {
      const playlistResponse = await fetch(
        "https://www.googleapis.com/youtube/v3/playlistItems?" +
          new URLSearchParams({
            part: "contentDetails",
            playlistId: uploadsPlaylistId,
            maxResults: "10",
          }),
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const playlistData = (await playlistResponse.json()) as {
        items?: Array<{ contentDetails?: { videoId?: string } }>;
      };

      const videoIds = (playlistData.items ?? [])
        .map((item) => item.contentDetails?.videoId)
        .filter(Boolean)
        .join(",");

      if (videoIds) {
        const videosResponse = await fetch(
          "https://www.googleapis.com/youtube/v3/videos?" +
            new URLSearchParams({
              part: "statistics",
              id: videoIds,
            }),
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );
        const videosData = (await videosResponse.json()) as YouTubeVideosResponse;

        for (const video of videosData.items ?? []) {
          likes += Number(video.statistics?.likeCount ?? 0);
          comments += Number(video.statistics?.commentCount ?? 0);
        }
      }
    }

    return {
      ok: true,
      stats: {
        platform: "youtube",
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

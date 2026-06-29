import type { StatsFetchResult } from "./types";

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function fetchPinterestStats(
  accessToken: string,
): Promise<StatsFetchResult> {
  try {
    const pinsResponse = await fetch(
      "https://api.pinterest.com/v5/pins?page_size=1",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const pinsData = (await pinsResponse.json()) as {
      items?: Array<{ id?: string }>;
      message?: string;
    };

    if (!pinsResponse.ok) {
      return {
        ok: false,
        error: pinsData.message ?? "Pinterest pins fetch failed",
      };
    }

    const pinId = pinsData.items?.[0]?.id;
    if (!pinId) {
      return {
        ok: true,
        stats: {
          platform: "pinterest",
          views: 0,
          likes: 0,
          comments: 0,
          source: "live",
        },
      };
    }

    const endDate = formatDate(new Date());
    const startDate = formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const analyticsUrl =
      `https://api.pinterest.com/v5/pins/${pinId}/analytics?` +
      new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        metric_types: "IMPRESSION,SAVE,PIN_CLICK",
      }).toString();

    const analyticsResponse = await fetch(analyticsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const analyticsData = (await analyticsResponse.json()) as {
      all?: {
        summary_metrics?: {
          IMPRESSION?: number;
          SAVE?: number;
          PIN_CLICK?: number;
        };
      };
      message?: string;
    };

    if (!analyticsResponse.ok) {
      return {
        ok: false,
        error: analyticsData.message ?? "Pinterest analytics unavailable",
      };
    }

    const metrics = analyticsData.all?.summary_metrics;

    return {
      ok: true,
      stats: {
        platform: "pinterest",
        views: metrics?.IMPRESSION ?? 0,
        likes: metrics?.SAVE ?? 0,
        comments: metrics?.PIN_CLICK ?? 0,
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

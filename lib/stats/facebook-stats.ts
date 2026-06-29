import type { StatsFetchResult } from "./types";

type SummaryCount = { summary?: { total_count?: number } };
type InsightValue = { name?: string; values?: Array<{ value?: number }> };
type FacebookPost = {
  likes?: SummaryCount;
  comments?: SummaryCount;
  shares?: { count?: number };
  insights?: { data?: InsightValue[] };
};

type FacebookPostsResponse = {
  data?: FacebookPost[];
  error?: { message?: string };
};

async function resolveFacebookPageId(
  accessToken: string,
  storedPageId?: string,
): Promise<string> {
  if (storedPageId) {
    return storedPageId;
  }

  const response = await fetch(
    `https://graph.facebook.com/v21.0/me?` +
      new URLSearchParams({ fields: "id", access_token: accessToken }),
  );
  const data = (await response.json()) as { id?: string; error?: { message?: string } };

  if (!response.ok || !data.id) {
    throw new Error(data.error?.message ?? "Could not resolve Facebook Page id");
  }

  return data.id;
}

function readPostImpressions(post: FacebookPost): number {
  const insight = post.insights?.data?.find((item) => item.name === "post_impressions");
  return insight?.values?.[0]?.value ?? 0;
}

export async function fetchFacebookStats(
  accessToken: string,
  pageId?: string,
): Promise<StatsFetchResult> {
  try {
    const resolvedPageId = await resolveFacebookPageId(accessToken, pageId);
    const params = new URLSearchParams({
      fields: "likes.summary(true),comments.summary(true),shares,insights.metric(post_impressions)",
      limit: "1",
      access_token: accessToken,
    });

    let response = await fetch(
      `https://graph.facebook.com/v21.0/${resolvedPageId}/posts?${params.toString()}`,
    );
    let data = (await response.json()) as FacebookPostsResponse;

    if (!response.ok) {
      const fallbackParams = new URLSearchParams({
        fields: "likes.summary(true),comments.summary(true),shares",
        limit: "1",
        access_token: accessToken,
      });
      response = await fetch(
        `https://graph.facebook.com/v21.0/${resolvedPageId}/posts?${fallbackParams.toString()}`,
      );
      data = (await response.json()) as FacebookPostsResponse;
    }

    if (!response.ok) {
      return {
        ok: false,
        error: data.error?.message ?? "Facebook posts fetch failed",
      };
    }

    const latest = data.data?.[0];
    if (!latest) {
      return {
        ok: true,
        stats: {
          platform: "facebook",
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
        platform: "facebook",
        views: readPostImpressions(latest),
        likes: latest.likes?.summary?.total_count ?? 0,
        comments: latest.comments?.summary?.total_count ?? 0,
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

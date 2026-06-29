import type { StatsFetchResult } from "./types";

type InsightValue = { value?: number };
type InsightMetric = { name?: string; values?: InsightValue[] };
type InsightsResponse = {
  data?: InsightMetric[];
  error?: { message?: string };
};

type ThreadsListResponse = {
  data?: Array<{ id?: string }>;
  error?: { message?: string };
};

async function resolveThreadsUserId(accessToken: string): Promise<string> {
  const params = new URLSearchParams({
    fields: "id",
    access_token: accessToken,
  });

  const response = await fetch(`https://graph.threads.net/me?${params.toString()}`);
  const data = (await response.json()) as { id?: string; error?: { message?: string } };

  if (!response.ok || !data.id) {
    throw new Error(data.error?.message ?? "Could not resolve Threads user id");
  }

  return String(data.id);
}

function readInsightMetric(metrics: InsightMetric[] | undefined, name: string): number {
  const metric = metrics?.find((item) => item.name === name);
  return metric?.values?.[0]?.value ?? 0;
}

async function fetchLatestThreadInsights(
  accessToken: string,
  userId: string,
): Promise<StatsFetchResult | null> {
  const listParams = new URLSearchParams({
    fields: "id",
    limit: "1",
    access_token: accessToken,
  });

  const listResponse = await fetch(
    `https://graph.threads.net/v1.0/${userId}/threads?${listParams.toString()}`,
  );
  const listData = (await listResponse.json()) as ThreadsListResponse;
  const threadId = listData.data?.[0]?.id;

  if (!listResponse.ok || !threadId) {
    return null;
  }

  const insightParams = new URLSearchParams({
    metric: "views,likes,replies",
    access_token: accessToken,
  });

  const insightResponse = await fetch(
    `https://graph.threads.net/v1.0/${threadId}/insights?${insightParams.toString()}`,
  );
  const insightData = (await insightResponse.json()) as InsightsResponse;

  if (!insightResponse.ok) {
    return null;
  }

  return {
    ok: true,
    stats: {
      platform: "threads",
      views: readInsightMetric(insightData.data, "views"),
      likes: readInsightMetric(insightData.data, "likes"),
      comments: readInsightMetric(insightData.data, "replies"),
      source: "live",
    },
  };
}

export async function fetchThreadsStats(
  accessToken: string,
): Promise<StatsFetchResult> {
  try {
    const userId = await resolveThreadsUserId(accessToken);
    const params = new URLSearchParams({
      metric: "views,likes,replies",
      access_token: accessToken,
    });

    const response = await fetch(
      `https://graph.threads.net/v1.0/${userId}/threads_insights?${params.toString()}`,
    );
    const data = (await response.json()) as InsightsResponse;

    if (response.ok) {
      return {
        ok: true,
        stats: {
          platform: "threads",
          views: readInsightMetric(data.data, "views"),
          likes: readInsightMetric(data.data, "likes"),
          comments: readInsightMetric(data.data, "replies"),
          source: "live",
        },
      };
    }

    const latestPostStats = await fetchLatestThreadInsights(accessToken, userId);
    if (latestPostStats?.ok) {
      return latestPostStats;
    }

    return {
      ok: false,
      error: data.error?.message ?? "Threads insights unavailable",
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

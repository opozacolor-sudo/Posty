import { getLinkedInApiVersion } from "../linkedin-env";
import type { StatsFetchResult } from "./types";

const LINKEDIN_HEADERS = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
  "LinkedIn-Version": getLinkedInApiVersion(),
  "X-Restli-Protocol-Version": "2.0.0",
});

async function resolvePersonUrn(
  accessToken: string,
  personId?: string,
): Promise<string> {
  if (personId) {
    return personId.startsWith("urn:li:person:")
      ? personId
      : `urn:li:person:${personId}`;
  }

  const response = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await response.json()) as { sub?: string; message?: string };

  if (!response.ok || !data.sub) {
    throw new Error(data.message ?? "Could not resolve LinkedIn member id");
  }

  return `urn:li:person:${data.sub}`;
}

export async function fetchLinkedInStats(
  accessToken: string,
  personId?: string,
): Promise<StatsFetchResult> {
  try {
    const author = await resolvePersonUrn(accessToken, personId);
    const postsUrl =
      "https://api.linkedin.com/rest/posts?" +
      new URLSearchParams({
        q: "author",
        author,
        count: "1",
        sortBy: "LAST_MODIFIED",
      }).toString();

    const postsResponse = await fetch(postsUrl, {
      headers: LINKEDIN_HEADERS(accessToken),
    });
    const postsData = (await postsResponse.json()) as {
      elements?: Array<{ id?: string }>;
      message?: string;
    };

    if (!postsResponse.ok) {
      return {
        ok: false,
        error: postsData.message ?? "LinkedIn posts fetch failed",
      };
    }

    const postUrn = postsData.elements?.[0]?.id;
    if (!postUrn) {
      return {
        ok: true,
        stats: {
          platform: "linkedin",
          views: 0,
          likes: 0,
          comments: 0,
          source: "live",
        },
      };
    }

    const socialResponse = await fetch(
      `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}`,
      { headers: LINKEDIN_HEADERS(accessToken) },
    );
    const socialData = (await socialResponse.json()) as {
      likesSummary?: { totalLikes?: number };
      commentsSummary?: { totalFirstLevelComments?: number };
      message?: string;
    };

    if (!socialResponse.ok) {
      return {
        ok: false,
        error: socialData.message ?? "LinkedIn engagement fetch failed",
      };
    }

    return {
      ok: true,
      stats: {
        platform: "linkedin",
        views: 0,
        likes: socialData.likesSummary?.totalLikes ?? 0,
        comments: socialData.commentsSummary?.totalFirstLevelComments ?? 0,
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

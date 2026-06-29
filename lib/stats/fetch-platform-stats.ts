import type { SocialPlatform } from "@/lib/dashboard-data";
import type { ConnectedAccountWithToken } from "@/lib/publish-accounts";
import { fetchFacebookStats } from "./facebook-stats";
import { fetchInstagramStats } from "./instagram-stats";
import { fetchLinkedInStats } from "./linkedin-stats";
import { fetchPinterestStats } from "./pinterest-stats";
import { fetchThreadsStats } from "./threads-stats";
import { fetchTikTokStats } from "./tiktok-stats";
import { fetchYouTubeStats } from "./youtube-stats";
import { emptyStats, type PlatformStatsResult } from "./types";

async function fetchStatsForPlatform(
  account: ConnectedAccountWithToken,
): Promise<PlatformStatsResult> {
  let result;

  switch (account.platform) {
    case "instagram":
      result = await fetchInstagramStats(account.accessToken);
      break;
    case "threads":
      result = await fetchThreadsStats(account.accessToken);
      break;
    case "youtube":
      result = await fetchYouTubeStats(account.accessToken);
      break;
    case "facebook":
      result = await fetchFacebookStats(
        account.accessToken,
        account.platformMetadata.pageId,
      );
      break;
    case "linkedin":
      result = await fetchLinkedInStats(
        account.accessToken,
        account.platformMetadata.personId,
      );
      break;
    case "pinterest":
      result = await fetchPinterestStats(account.accessToken);
      break;
    case "tiktok":
      result = await fetchTikTokStats(account.accessToken);
      break;
    case "x":
    case "bluesky":
      return emptyStats(account.platform);
    default:
      return emptyStats(account.platform as SocialPlatform);
  }

  if (result.ok) {
    return result.stats;
  }

  console.warn(
    `[posty/stats] ${account.platform} unavailable:`,
    result.error,
  );
  return emptyStats(account.platform);
}

export async function fetchConnectedPlatformStats(
  accounts: ConnectedAccountWithToken[],
): Promise<PlatformStatsResult[]> {
  const results = await Promise.all(
    accounts.map((account) => fetchStatsForPlatform(account)),
  );

  const byPlatform = new Map<SocialPlatform, PlatformStatsResult>();
  for (const stats of results) {
    byPlatform.set(stats.platform, stats);
  }

  return Array.from(byPlatform.values());
}

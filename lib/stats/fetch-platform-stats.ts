import type { SocialPlatform } from "@/lib/dashboard-data";
import type { ConnectedAccountWithToken } from "@/lib/publish-accounts";
import { fetchInstagramStats } from "./instagram-stats";
import { fetchThreadsStats } from "./threads-stats";
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
    default:
      return emptyStats(account.platform);
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

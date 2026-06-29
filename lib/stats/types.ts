import type { PlatformStats, SocialPlatform } from "@/lib/dashboard-data";

export type PlatformStatsResult = PlatformStats & {
  unavailable?: boolean;
  source?: "live" | "unavailable";
};

export type StatsFetchResult =
  | { ok: true; stats: PlatformStatsResult }
  | { ok: false; error: string };

export function emptyStats(platform: SocialPlatform): PlatformStatsResult {
  return {
    platform,
    views: 0,
    likes: 0,
    comments: 0,
    unavailable: true,
    source: "unavailable",
  };
}

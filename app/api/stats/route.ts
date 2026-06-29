import { NextResponse } from "next/server";
import { PLATFORMS, type PlatformStats } from "@/lib/dashboard-data";
import { fetchConnectedPlatformStats } from "@/lib/stats/fetch-platform-stats";
import { emptyStats } from "@/lib/stats/types";
import { fetchConnectedAccountsWithTokens } from "@/lib/publish-accounts";
import { createClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const accounts = await fetchConnectedAccountsWithTokens(user.id, supabase);
  const liveStats = await fetchConnectedPlatformStats(accounts);
  const liveByPlatform = new Map(liveStats.map((item) => [item.platform, item]));

  const stats: PlatformStats[] = PLATFORMS.map((platform) => {
    const account = accounts.find((item) => item.platform === platform);
    if (!account) {
      return emptyStats(platform);
    }

    return liveByPlatform.get(platform) ?? emptyStats(platform);
  });

  return NextResponse.json({ stats });
}

import { createClient } from "@/lib/supabase-server";
import {
  MOCK_CONNECTED_ACCOUNTS,
  PLATFORMS,
  type ConnectedAccount,
  type SocialPlatform,
} from "./dashboard-data";

export type ConnectedAccountRow = {
  id: string;
  user_id: string;
  platform: string;
  account_name: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

export function mergeConnectedAccounts(
  rows: Pick<ConnectedAccountRow, "platform" | "account_name" | "is_active">[],
): ConnectedAccount[] {
  const activePlatforms = new Set(
    rows.filter((row) => row.is_active).map((row) => row.platform),
  );

  return PLATFORMS.map((platform) => {
    const row = rows.find((item) => item.platform === platform);
    const connected = activePlatforms.has(platform);

    return {
      platform,
      connected,
      accountName: row?.account_name ?? undefined,
    };
  });
}

export function getFallbackConnectedAccounts(): ConnectedAccount[] {
  return MOCK_CONNECTED_ACCOUNTS.map(({ platform, connected }) => ({
    platform,
    connected,
  }));
}

export function isOAuthPlatform(
  platform: SocialPlatform,
): platform is "instagram" {
  return platform === "instagram";
}

export const INSTAGRAM_OAUTH_PATH = "/api/auth/instagram";

export async function fetchUserConnectedAccounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<ConnectedAccount[]> {
  const { data, error } = await supabase
    .from("connected_accounts")
    .select("platform, account_name, is_active")
    .eq("user_id", userId);

  if (error || !data) {
    return getFallbackConnectedAccounts();
  }

  return mergeConnectedAccounts(data);
}

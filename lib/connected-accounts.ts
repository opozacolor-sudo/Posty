import { createClient } from "@/lib/supabase-server";
import {
  MOCK_CONNECTED_ACCOUNTS,
  PLATFORMS,
  type ConnectedAccount,
} from "./dashboard-data";

export {
  buildConnectUrl,
  getOAuthPath,
  INSTAGRAM_OAUTH_PATH,
  YOUTUBE_OAUTH_PATH,
  buildOAuthUrl,
} from "./oauth-platforms";

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

export async function fetchUserConnectedAccounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<ConnectedAccount[]> {
  const { data, error } = await supabase
    .from("connected_accounts")
    .select("platform, account_name, is_active")
    .eq("user_id", userId);

  if (error || !data) {
    return PLATFORMS.map((platform) => ({ platform, connected: false }));
  }

  return mergeConnectedAccounts(data);
}

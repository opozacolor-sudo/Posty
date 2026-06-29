import type { SupabaseClient } from "@supabase/supabase-js";
import type { SocialPlatform } from "./dashboard-data";
import { createAdminClient, isSupabaseAdminConfigured } from "./supabase-admin";

export type ConnectedAccountWithToken = {
  platform: SocialPlatform;
  accountName: string | null;
  accessToken: string;
  refreshToken: string | null;
  isActive: boolean;
  platformMetadata: Record<string, string>;
};

type ConnectedAccountTokenRow = {
  platform: string;
  account_name: string | null;
  access_token: string | null;
  refresh_token: string | null;
  is_active: boolean;
  platform_metadata: unknown;
};

function mapConnectedAccountRows(
  rows: ConnectedAccountTokenRow[],
): ConnectedAccountWithToken[] {
  return rows
    .filter((row) => row.access_token)
    .map((row) => ({
      platform: row.platform as SocialPlatform,
      accountName: row.account_name,
      accessToken: row.access_token as string,
      refreshToken: row.refresh_token ?? null,
      isActive: row.is_active,
      platformMetadata:
        row.platform_metadata &&
        typeof row.platform_metadata === "object" &&
        !Array.isArray(row.platform_metadata)
          ? (row.platform_metadata as Record<string, string>)
          : {},
    }));
}

async function fetchRowsFromClient(
  client: SupabaseClient,
  userId: string,
): Promise<ConnectedAccountTokenRow[]> {
  const { data, error } = await client
    .from("connected_accounts")
    .select(
      "platform, account_name, access_token, refresh_token, is_active, platform_metadata",
    )
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    console.error("[posty/publish] fetch accounts failed:", error.message);
    return [];
  }

  return data ?? [];
}

export async function fetchConnectedAccountsWithTokens(
  userId: string,
  sessionClient?: SupabaseClient,
): Promise<ConnectedAccountWithToken[]> {
  if (isSupabaseAdminConfigured()) {
    const admin = createAdminClient();
    return mapConnectedAccountRows(await fetchRowsFromClient(admin, userId));
  }

  if (sessionClient) {
    console.warn(
      "[posty/publish] SUPABASE_SERVICE_ROLE_KEY missing — using user session for tokens",
    );
    return mapConnectedAccountRows(await fetchRowsFromClient(sessionClient, userId));
  }

  console.error("[posty/publish] SUPABASE_SERVICE_ROLE_KEY missing and no session client");
  return [];
}

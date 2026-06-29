import { createAdminClient, isSupabaseAdminConfigured } from "./supabase-admin";
import type { SocialPlatform } from "./dashboard-data";

export type ConnectedAccountWithToken = {
  platform: SocialPlatform;
  accountName: string | null;
  accessToken: string;
  isActive: boolean;
  platformMetadata: Record<string, string>;
};

export async function fetchConnectedAccountsWithTokens(
  userId: string,
): Promise<ConnectedAccountWithToken[]> {
  if (!isSupabaseAdminConfigured()) {
    console.error("[posty/publish] SUPABASE_SERVICE_ROLE_KEY missing");
    return [];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("connected_accounts")
    .select("platform, account_name, access_token, is_active, platform_metadata")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    console.error("[posty/publish] fetch accounts failed:", error.message);
    return [];
  }

  return (data ?? [])
    .filter((row) => row.access_token)
    .map((row) => ({
      platform: row.platform as SocialPlatform,
      accountName: row.account_name,
      accessToken: row.access_token as string,
      isActive: row.is_active,
      platformMetadata:
        row.platform_metadata &&
        typeof row.platform_metadata === "object" &&
        !Array.isArray(row.platform_metadata)
          ? (row.platform_metadata as Record<string, string>)
          : {},
    }));
}

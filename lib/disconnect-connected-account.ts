import { createAdminClient, isSupabaseAdminConfigured } from "./supabase-admin";
import { PLATFORMS, type SocialPlatform } from "./dashboard-data";
import { createClient } from "./supabase-server";

export function isDisconnectablePlatform(platform: string): platform is SocialPlatform {
  return (PLATFORMS as readonly string[]).includes(platform);
}

export async function disconnectConnectedAccount(
  userId: string,
  platform: SocialPlatform,
): Promise<{ ok: true } | { ok: false }> {
  if (isSupabaseAdminConfigured()) {
    const admin = createAdminClient();
    const { error } = await admin
      .from("connected_accounts")
      .delete()
      .eq("user_id", userId)
      .eq("platform", platform);

    if (error) {
      console.error("[posty/connected-accounts] Admin disconnect failed:", error);
      return { ok: false };
    }

    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("connected_accounts")
    .delete()
    .eq("user_id", userId)
    .eq("platform", platform);

  if (error) {
    console.error("[posty/connected-accounts] Disconnect failed:", error);
    return { ok: false };
  }

  return { ok: true };
}

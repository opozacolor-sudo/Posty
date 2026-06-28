import { createAdminClient, isSupabaseAdminConfigured } from "./supabase-admin";
import { createClient } from "./supabase-server";

export type ConnectedAccountUpsert = {
  user_id: string;
  platform: string;
  account_name: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  is_active: boolean;
};

export async function upsertConnectedAccount(
  data: ConnectedAccountUpsert,
): Promise<{ ok: true } | { ok: false; reason: "missing_table" | "permission" | "unknown" }> {
  const payload = { ...data };

  const runUpsert = async (
    client: ReturnType<typeof createAdminClient> | Awaited<ReturnType<typeof createClient>>,
  ) =>
    client.from("connected_accounts").upsert(payload, {
      onConflict: "user_id,platform",
    });

  if (isSupabaseAdminConfigured()) {
    const { error } = await runUpsert(createAdminClient());

    if (!error) {
      return { ok: true };
    }

    console.error("[posty/connected-accounts] Admin upsert failed:", error);
    return classifyUpsertError(error);
  }

  const supabase = await createClient();
  const { error } = await runUpsert(supabase);

  if (!error) {
    return { ok: true };
  }

  console.error("[posty/connected-accounts] Upsert failed:", error);
  return classifyUpsertError(error);
}

function classifyUpsertError(error: { code?: string; message?: string }): {
  ok: false;
  reason: "missing_table" | "permission" | "unknown";
} {
  const code = error.code ?? "";
  const message = error.message?.toLowerCase() ?? "";

  if (code === "42P01" || message.includes("does not exist")) {
    return { ok: false, reason: "missing_table" };
  }

  if (
    code === "42501" ||
    message.includes("permission denied") ||
    message.includes("row-level security")
  ) {
    return { ok: false, reason: "permission" };
  }

  return { ok: false, reason: "unknown" };
}

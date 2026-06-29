import { createAdminClient, isSupabaseAdminConfigured } from "./supabase-admin";
import { assertSupabaseConfigured } from "./supabase-env";

export type ConnectedAccountUpsert = {
  user_id: string;
  platform: string;
  account_name: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  is_active: boolean;
};

export type SaveConnectedAccountFailureReason =
  | "missing_service_role"
  | "missing_table"
  | "permission"
  | "unknown";

export function mapSaveFailureToOAuthErrorKey(
  reason: SaveConnectedAccountFailureReason,
  platform: "youtube" | "instagram" | "facebook" | "threads" | "tiktok" | "linkedin" | "pinterest",
): string {
  if (reason === "missing_service_role") {
    return `${platform}_service_role_missing`;
  }
  if (reason === "permission") {
    return `${platform}_save_permission`;
  }
  if (reason === "missing_table") {
    return `${platform}_save_failed`;
  }
  return `${platform}_save_unknown`;
}

export function getSupabaseProjectRef(): string | null {
  const { url } = assertSupabaseConfigured();
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? null;
}

export async function checkConnectedAccountsTable(): Promise<{
  ready: boolean;
  serviceRoleConfigured: boolean;
  projectRef: string | null;
  errorCode?: string;
  errorMessage?: string;
}> {
  const projectRef = getSupabaseProjectRef();
  const serviceRoleConfigured = isSupabaseAdminConfigured();

  if (!serviceRoleConfigured) {
    return {
      ready: false,
      serviceRoleConfigured: false,
      projectRef,
      errorCode: "missing_service_role",
      errorMessage: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server.",
    };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("connected_accounts").select("id").limit(1);

  if (!error) {
    return { ready: true, serviceRoleConfigured: true, projectRef };
  }

  return {
    ready: false,
    serviceRoleConfigured: true,
    projectRef,
    errorCode: error.code,
    errorMessage: error.message,
  };
}

export async function upsertConnectedAccount(
  data: ConnectedAccountUpsert,
): Promise<{ ok: true } | { ok: false; reason: SaveConnectedAccountFailureReason }> {
  if (!isSupabaseAdminConfigured()) {
    console.error(
      "[posty/connected-accounts] SUPABASE_SERVICE_ROLE_KEY missing on server",
    );
    return { ok: false, reason: "missing_service_role" };
  }

  const admin = createAdminClient();
  const { user_id, platform, ...fields } = data;

  const { data: existing, error: selectError } = await admin
    .from("connected_accounts")
    .select("id")
    .eq("user_id", user_id)
    .eq("platform", platform)
    .maybeSingle();

  if (selectError) {
    console.error("[posty/connected-accounts] Select failed:", selectError);
    return { ok: false, reason: classifyUpsertError(selectError) };
  }

  const row = { user_id, platform, ...fields };

  if (existing?.id) {
    const { error: updateError } = await admin
      .from("connected_accounts")
      .update(row)
      .eq("id", existing.id);

    if (!updateError) {
      return { ok: true };
    }

    console.error("[posty/connected-accounts] Update failed:", updateError);
    return { ok: false, reason: classifyUpsertError(updateError) };
  }

  const { error: insertError } = await admin.from("connected_accounts").insert(row);

  if (!insertError) {
    return { ok: true };
  }

  console.error("[posty/connected-accounts] Insert failed:", insertError);
  return { ok: false, reason: classifyUpsertError(insertError) };
}

function classifyUpsertError(error: { code?: string; message?: string }): SaveConnectedAccountFailureReason {
  const code = error.code ?? "";
  const message = error.message?.toLowerCase() ?? "";

  if (
    code === "42P01" ||
    code === "PGRST205" ||
    code === "PGRST204" ||
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    message.includes("schema cache")
  ) {
    return "missing_table";
  }

  if (
    code === "42501" ||
    message.includes("permission denied") ||
    message.includes("row-level security")
  ) {
    return "permission";
  }

  return "unknown";
}

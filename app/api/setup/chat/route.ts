import { NextResponse } from "next/server";
import { getAnthropicEnvDebug, isAnthropicConfigured } from "@/lib/anthropic-env";
import { pingClaude } from "@/lib/anthropic-client";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const env = getAnthropicEnvDebug();
  const ping = isAnthropicConfigured() ? await pingClaude() : { ok: false, error: "not_configured" };

  return NextResponse.json({
    ...env,
    ping,
  });
}

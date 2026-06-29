import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/app-url";
import { runScheduledPublish } from "@/lib/run-scheduled-publish";
import { isSupabaseAdminConfigured } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorizedCronRequest(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY missing" },
      { status: 503 },
    );
  }

  try {
    const result = await runScheduledPublish({
      appBaseUrl: getAppBaseUrl(request),
    });

    console.info("[posty/cron] publish-scheduled:", result);

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[posty/cron] publish-scheduled failed:", message);

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

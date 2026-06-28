import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { buildThreadsOAuthUrl } from "@/lib/threads-oauth";
import { getThreadsEnvDebug, isThreadsConfigured } from "@/lib/threads-env";
import {
  redirectToAccountsAfterThreads,
  resolveOAuthLocale,
  setThreadsOAuthCookies,
} from "@/lib/threads-oauth-session";
import { createClient } from "@/lib/supabase-server";

function redirectToLogin(request: NextRequest, locale: ReturnType<typeof resolveOAuthLocale>) {
  return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
}

export async function GET(request: NextRequest) {
  const locale = resolveOAuthLocale(request.nextUrl.searchParams.get("locale"));

  if (!isThreadsConfigured()) {
    const threadsEnv = getThreadsEnvDebug();
    console.warn(
      "[posty/threads-oauth] Blocked — missing:",
      threadsEnv.missing.join(", ") || "unknown",
    );
    return redirectToAccountsAfterThreads(request, locale, {
      error: "threads_not_configured",
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectToLogin(request, locale);
  }

  const state = randomUUID();
  const response = NextResponse.redirect(buildThreadsOAuthUrl(state));
  setThreadsOAuthCookies(response, state, locale);

  return response;
}

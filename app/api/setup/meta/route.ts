import { NextResponse } from "next/server";
import {
  FACEBOOK_OAUTH_SCOPES,
} from "@/lib/meta-oauth";
import { INSTAGRAM_BUSINESS_SCOPES } from "@/lib/instagram-business-oauth";
import { getInstagramEnvDebug, isInstagramConfigured } from "@/lib/instagram-env";
import { THREADS_OAUTH_SCOPES } from "@/lib/threads-oauth";
import { getThreadsEnvDebug, isThreadsConfigured } from "@/lib/threads-env";
import { getMetaEnvDebug, isMetaConfigured } from "@/lib/meta-env";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    metaConfigured: isMetaConfigured(),
    instagramConfigured: isInstagramConfigured(),
    threadsConfigured: isThreadsConfigured(),
    meta: getMetaEnvDebug(),
    instagram: getInstagramEnvDebug(),
    threads: getThreadsEnvDebug(),
    instagramScopes: INSTAGRAM_BUSINESS_SCOPES,
    threadsScopes: THREADS_OAUTH_SCOPES,
    facebookScopes: FACEBOOK_OAUTH_SCOPES,
  });
}

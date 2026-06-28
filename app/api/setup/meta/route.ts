import { NextResponse } from "next/server";
import {
  FACEBOOK_OAUTH_SCOPES,
  INSTAGRAM_OAUTH_SCOPES,
} from "@/lib/meta-oauth";
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

  const metaEnv = getMetaEnvDebug();

  return NextResponse.json({
    configured: isMetaConfigured(),
    appId: metaEnv.appId,
    instagramRedirectUri: metaEnv.instagramRedirectUri,
    facebookRedirectUri: metaEnv.facebookRedirectUri,
    instagramScopes: INSTAGRAM_OAUTH_SCOPES,
    facebookScopes: FACEBOOK_OAUTH_SCOPES,
    missing: metaEnv.missing,
  });
}

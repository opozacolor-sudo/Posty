import { NextResponse } from "next/server";
import {
  FACEBOOK_OAUTH_SCOPES,
} from "@/lib/meta-oauth";
import { getInstagramEnvDebug, isInstagramConfigured } from "@/lib/instagram-env";
import { INSTAGRAM_BUSINESS_SCOPES } from "@/lib/instagram-business-oauth";
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
    meta: getMetaEnvDebug(),
    instagram: getInstagramEnvDebug(),
    instagramScopes: INSTAGRAM_BUSINESS_SCOPES,
    facebookScopes: FACEBOOK_OAUTH_SCOPES,
  });
}

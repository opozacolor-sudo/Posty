import { NextResponse } from "next/server";
import { getInstagramEnvDebug } from "@/lib/instagram-env";
import { getMetaEnvDebug } from "@/lib/meta-env";
import { getThreadsEnvDebug } from "@/lib/threads-env";

/** Public read-only OAuth config (IDs + redirect URIs only, no secrets). */
export async function GET() {
  return NextResponse.json({
    meta: getMetaEnvDebug(),
    instagram: getInstagramEnvDebug(),
    threads: getThreadsEnvDebug(),
  });
}

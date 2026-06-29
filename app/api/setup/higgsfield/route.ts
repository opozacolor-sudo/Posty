import { NextResponse } from "next/server";
import { getHiggsfieldEnvDebug, isHiggsfieldConfigured } from "@/lib/higgsfield-env";
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
    ...getHiggsfieldEnvDebug(),
    setupDocs: "https://cloud.higgsfield.ai/",
    envHint:
      "Set HF_CREDENTIALS=KEY_ID:KEY_SECRET on Vercel (from Higgsfield Cloud). Same credentials power the higgsfield CLI.",
    imageEndpoint:
      process.env.HIGGSFIELD_IMAGE_ENDPOINT?.trim() ||
      "flux-pro/kontext/max/text-to-image",
    ready: isHiggsfieldConfigured(),
  });
}

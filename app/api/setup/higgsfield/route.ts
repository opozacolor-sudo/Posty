import {
  formatHiggsfieldError,
  generateHiggsfieldImage,
} from "@/lib/higgsfield-generate";
import {
  getHiggsfieldEnvDebugAsync,
  isHiggsfieldGenerationAvailable,
  isHiggsfieldSdkConfigured,
  isVercelDeployment,
} from "@/lib/higgsfield-env";
import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const debug = await getHiggsfieldEnvDebugAsync();
  const onVercel = isVercelDeployment();

  return NextResponse.json({
    ...debug,
    deployment: onVercel ? "vercel" : "local",
    setupDocs: "https://cloud.higgsfield.ai/api-keys",
    envHint: onVercel
      ? "Vercel (live): HF_API_KEY + HF_API_SECRET from cloud.higgsfield.ai/api-keys, then redeploy."
      : isHiggsfieldSdkConfigured()
        ? "Using Higgsfield API credentials (works locally and on Vercel)."
        : debug.credentialSource === "cli"
          ? "Using local higgsfield CLI. For Vercel, add HF_API_KEY + HF_API_SECRET."
          : "Add HF_API_KEY + HF_API_SECRET from cloud.higgsfield.ai/api-keys.",
    imageEndpoint:
      process.env.HIGGSFIELD_IMAGE_ENDPOINT?.trim() ||
      "flux-pro/kontext/max/text-to-image",
    ready: isHiggsfieldGenerationAvailable(),
    probeHint: "POST to this URL to run a live generation test.",
  });
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isHiggsfieldGenerationAvailable()) {
    return NextResponse.json(
      { ok: false, error: "not_configured", debug: await getHiggsfieldEnvDebugAsync() },
      { status: 503 },
    );
  }

  try {
    const result = await generateHiggsfieldImage({
      prompt: "Minimal summer Instagram story graphic, warm colors, no text",
      aspectRatio: "9:16",
    });

    return NextResponse.json({
      ok: true,
      url: result.url,
      requestId: result.requestId,
    });
  } catch (error) {
    const detail = formatHiggsfieldError(error);
    console.error("[posty/higgsfield] Probe failed:", detail);

    return NextResponse.json(
      {
        ok: false,
        error: "generation_failed",
        detail,
      },
      { status: 500 },
    );
  }
}

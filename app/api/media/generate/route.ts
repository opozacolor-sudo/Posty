import { NextResponse } from "next/server";
import {
  generateHiggsfieldImage,
  userWantsImageGeneration,
  userWantsVideoGeneration,
} from "@/lib/higgsfield-generate";
import {
  getHiggsfieldEnvDebugAsync,
  isHiggsfieldGenerationAvailable,
} from "@/lib/higgsfield-env";
import { createClient } from "@/lib/supabase-server";

type GenerateBody = {
  prompt?: string;
  type?: "image" | "video";
  aspectRatio?: "1:1" | "9:16" | "16:9" | "4:5";
};

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isHiggsfieldGenerationAvailable()) {
    return NextResponse.json(
      { error: "higgsfield_not_configured", debug: await getHiggsfieldEnvDebugAsync() },
      { status: 503 },
    );
  }

  const body = (await request.json()) as GenerateBody;
  const prompt = body.prompt?.trim();

  if (!prompt) {
    return NextResponse.json({ error: "prompt_required" }, { status: 400 });
  }

  const type = body.type ?? "image";

  if (type === "video") {
    return NextResponse.json(
      { error: "video_not_implemented_yet" },
      { status: 501 },
    );
  }

  try {
    const result = await generateHiggsfieldImage({
      prompt,
      aspectRatio: body.aspectRatio ?? "1:1",
    });

    return NextResponse.json({
      type: "image",
      url: result.url,
      thumbnailUrl: result.thumbnailUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[posty/higgsfield] Generate failed:", message);

    return NextResponse.json(
      { error: "generation_failed", detail: message },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const probe = searchParams.get("probe")?.trim();

  if (probe && userWantsImageGeneration(probe)) {
    return NextResponse.json({ wantsImage: true, wantsVideo: false });
  }
  if (probe && userWantsVideoGeneration(probe)) {
    return NextResponse.json({ wantsImage: false, wantsVideo: true });
  }

  return NextResponse.json(await getHiggsfieldEnvDebugAsync());
}

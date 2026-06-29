import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || apiKey.includes("your_openai")) {
    return NextResponse.json(
      { error: "transcribe_not_configured" },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const audio = formData.get("audio");

  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "no_audio" }, { status: 400 });
  }

  const locale = String(formData.get("locale") ?? "en");
  const whisperForm = new FormData();
  whisperForm.append("file", audio, "recording.webm");
  whisperForm.append("model", "whisper-1");
  whisperForm.append("response_format", "json");

  if (locale.startsWith("ro")) {
    whisperForm.append("language", "ro");
  } else if (locale.startsWith("en")) {
    whisperForm.append("language", "en");
  }

  try {
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: whisperForm,
    });

    const data = (await response.json()) as { text?: string; error?: { message?: string } };

    if (!response.ok || !data.text?.trim()) {
      return NextResponse.json(
        { error: data.error?.message ?? "transcribe_failed" },
        { status: 502 },
      );
    }

    return NextResponse.json({ text: data.text.trim() });
  } catch {
    return NextResponse.json({ error: "transcribe_failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import {
  sanitizeUploadFilename,
  validateChatUploadFile,
  type ChatAttachment,
} from "@/lib/chat-upload";
import { createClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }

  const validationError = validateChatUploadFile(file);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const safeName = sanitizeUploadFilename(file.name);
  const objectPath = `${user.id}/${Date.now()}-${safeName}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("chat-media")
    .upload(objectPath, bytes, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[posty/chat-upload] Storage upload failed:", uploadError.message);

    if (uploadError.message.toLowerCase().includes("bucket")) {
      return NextResponse.json(
        {
          error: "storage_not_configured",
          hint: "Run supabase migration for chat-media bucket",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("chat-media")
    .createSignedUrl(objectPath, 60 * 60);

  if (signError || !signed?.signedUrl) {
    console.error("[posty/chat-upload] Signed URL failed:", signError?.message);
    return NextResponse.json({ error: "signed_url_failed" }, { status: 500 });
  }

  const attachment: ChatAttachment = {
    url: signed.signedUrl,
    mediaType: file.type,
    name: safeName,
  };

  return NextResponse.json({ attachment });
}

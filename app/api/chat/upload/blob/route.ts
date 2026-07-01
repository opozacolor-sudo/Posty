import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import {
  ALLOWED_VIDEO_TYPES,
  MAX_VIDEO_BYTES,
} from "@/lib/chat-upload";
import { isVercelBlobConfigured } from "@/lib/blob-env";
import { createClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isVercelBlobConfigured()) {
    return NextResponse.json({ error: "blob_not_configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!pathname.startsWith(`${user.id}/`)) {
          throw new Error("invalid_upload_path");
        }

        if (clientPayload) {
          try {
            const payloadUserId = JSON.parse(clientPayload).userId as string | undefined;
            if (payloadUserId && payloadUserId !== user.id) {
              throw new Error("invalid_upload_owner");
            }
          } catch (error) {
            if (error instanceof Error && error.message === "invalid_upload_owner") {
              throw error;
            }
          }
        }

        return {
          allowedContentTypes: [...ALLOWED_VIDEO_TYPES],
          maximumSizeInBytes: MAX_VIDEO_BYTES,
          tokenPayload: JSON.stringify({ userId: user.id }),
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[posty/chat-upload/blob] failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

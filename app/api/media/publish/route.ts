import { NextResponse } from "next/server";
import {
  fetchChatMediaBytes,
  verifyPublishMediaSignature,
} from "@/lib/publish-media-url";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storagePath = searchParams.get("path")?.trim();
  const expiresAt = Number(searchParams.get("exp"));
  const signature = searchParams.get("sig")?.trim();

  if (!storagePath || !signature || !Number.isFinite(expiresAt)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (storagePath.includes("..") || storagePath.startsWith("/")) {
    return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  }

  if (!verifyPublishMediaSignature(storagePath, expiresAt, signature)) {
    return NextResponse.json({ error: "expired_or_invalid" }, { status: 403 });
  }

  const media = await fetchChatMediaBytes(storagePath);
  if (!media) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(media.bytes), {
    status: 200,
    headers: {
      "Content-Type": media.contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}

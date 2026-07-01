import { NextResponse } from "next/server";
import {
  fetchChatMediaBytes,
  fetchChunkedChatMediaBytes,
  verifyChunkedPublishMediaSignature,
  verifyPublishMediaSignature,
} from "@/lib/publish-media-url";

export const runtime = "nodejs";

function isValidStoragePath(storagePath: string): boolean {
  return !storagePath.includes("..") && !storagePath.startsWith("/");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const expiresAt = Number(searchParams.get("exp"));
  const signature = searchParams.get("sig")?.trim();

  if (!signature || !Number.isFinite(expiresAt)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const chunkedPaths = searchParams
    .get("paths")
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (chunkedPaths?.length) {
    if (chunkedPaths.some((path) => !isValidStoragePath(path))) {
      return NextResponse.json({ error: "invalid_path" }, { status: 400 });
    }

    if (!verifyChunkedPublishMediaSignature(chunkedPaths, expiresAt, signature)) {
      return NextResponse.json({ error: "expired_or_invalid" }, { status: 403 });
    }

    const media = await fetchChunkedChatMediaBytes(chunkedPaths);
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

  const storagePath = searchParams.get("path")?.trim();
  if (!storagePath) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (!isValidStoragePath(storagePath)) {
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

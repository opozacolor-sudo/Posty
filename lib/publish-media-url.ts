import { createHmac, timingSafeEqual } from "crypto";
import { getAppBaseUrl } from "./app-url";
import { createAdminClient, isSupabaseAdminConfigured } from "./supabase-admin";

const CHAT_MEDIA_BUCKET = "chat-media";
const PUBLISH_MEDIA_TTL_SECONDS = 60 * 60 * 24;

function getPublishMediaSecret(): string | null {
  const secret =
    process.env.PUBLISH_MEDIA_SIGNING_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  return secret || null;
}

export function parseChatMediaStoragePath(url: string): string | null {
  const signMatch = url.match(/\/object\/sign\/chat-media\/([^?]+)/i);
  if (signMatch?.[1]) {
    return decodeURIComponent(signMatch[1]);
  }

  const publicMatch = url.match(/\/object\/public\/chat-media\/([^?]+)/i);
  if (publicMatch?.[1]) {
    return decodeURIComponent(publicMatch[1]);
  }

  return null;
}

function signPublishMediaPath(storagePath: string, expiresAt: number): string {
  const secret = getPublishMediaSecret();
  if (!secret) {
    throw new Error("PUBLISH_MEDIA_SIGNING_SECRET missing");
  }

  return createHmac("sha256", secret)
    .update(`${storagePath}:${expiresAt}`)
    .digest("base64url");
}

export function verifyPublishMediaSignature(
  storagePath: string,
  expiresAt: number,
  signature: string,
): boolean {
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }

  const secret = getPublishMediaSecret();
  if (!secret) {
    return false;
  }

  try {
    const expected = signPublishMediaPath(storagePath, expiresAt);
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    return left.length === right.length && timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function signChunkedPublishMediaPaths(
  storagePaths: string[],
  expiresAt: number,
): string {
  const secret = getPublishMediaSecret();
  if (!secret) {
    throw new Error("PUBLISH_MEDIA_SIGNING_SECRET missing");
  }

  return createHmac("sha256", secret)
    .update(`${storagePaths.join("\0")}:${expiresAt}`)
    .digest("base64url");
}

export function verifyChunkedPublishMediaSignature(
  storagePaths: string[],
  expiresAt: number,
  signature: string,
): boolean {
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() || storagePaths.length === 0) {
    return false;
  }

  if (!getPublishMediaSecret()) {
    return false;
  }

  try {
    const expected = signChunkedPublishMediaPaths(storagePaths, expiresAt);
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    return left.length === right.length && timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export function buildPublishMediaProxyUrl(
  storagePath: string,
  baseUrl?: string,
): string | null {
  if (!getPublishMediaSecret()) {
    return null;
  }

  const expiresAt = Date.now() + PUBLISH_MEDIA_TTL_SECONDS * 1000;
  const signature = signPublishMediaPath(storagePath, expiresAt);
  const origin = (baseUrl ?? getAppBaseUrl()).replace(/\/$/, "");
  const params = new URLSearchParams({
    path: storagePath,
    exp: String(expiresAt),
    sig: signature,
  });

  return `${origin}/api/media/publish?${params.toString()}`;
}

export function buildChunkedPublishMediaProxyUrl(
  storagePaths: string[],
  baseUrl?: string,
): string | null {
  if (!getPublishMediaSecret() || storagePaths.length === 0) {
    return null;
  }

  const expiresAt = Date.now() + PUBLISH_MEDIA_TTL_SECONDS * 1000;
  const signature = signChunkedPublishMediaPaths(storagePaths, expiresAt);
  const origin = (baseUrl ?? getAppBaseUrl()).replace(/\/$/, "");
  const params = new URLSearchParams({
    paths: storagePaths.join(","),
    exp: String(expiresAt),
    sig: signature,
  });

  return `${origin}/api/media/publish?${params.toString()}`;
}

export async function resolvePublishMediaUrl(
  mediaUrl: string | null | undefined,
  baseUrl?: string,
): Promise<string | null> {
  if (!mediaUrl) {
    return null;
  }

  const storagePath = parseChatMediaStoragePath(mediaUrl);
  if (!storagePath) {
    return mediaUrl;
  }

  const proxyUrl = buildPublishMediaProxyUrl(storagePath, baseUrl);
  if (proxyUrl) {
    return proxyUrl;
  }

  if (!isSupabaseAdminConfigured()) {
    return mediaUrl;
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(CHAT_MEDIA_BUCKET)
    .createSignedUrl(storagePath, PUBLISH_MEDIA_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return mediaUrl;
  }

  return data.signedUrl;
}

export async function fetchChatMediaBytes(
  storagePath: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(CHAT_MEDIA_BUCKET)
    .download(storagePath);

  if (error || !data) {
    console.error("[posty/publish-media] download failed:", error?.message);
    return null;
  }

  const bytes = Buffer.from(await data.arrayBuffer());
  const contentType = data.type || "application/octet-stream";

  return { bytes, contentType };
}

export async function fetchChunkedChatMediaBytes(
  storagePaths: string[],
): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const parts: Buffer[] = [];
  let contentType = "video/mp4";

  for (const storagePath of storagePaths) {
    const part = await fetchChatMediaBytes(storagePath);
    if (!part) {
      return null;
    }
    parts.push(part.bytes);
    contentType = part.contentType;
  }

  return { bytes: Buffer.concat(parts), contentType };
}

export async function fetchPublishMediaBytes(
  mediaUrl: string,
  storagePaths?: string[],
): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (storagePaths?.length) {
    return fetchChunkedChatMediaBytes(storagePaths);
  }

  const storagePath = parseChatMediaStoragePath(mediaUrl);
  if (storagePath) {
    return fetchChatMediaBytes(storagePath);
  }

  try {
    const response = await fetch(mediaUrl);
    if (!response.ok) {
      return null;
    }

    const contentType =
      response.headers.get("content-type") ?? "application/octet-stream";
    const bytes = Buffer.from(await response.arrayBuffer());
    return { bytes, contentType };
  } catch {
    return null;
  }
}

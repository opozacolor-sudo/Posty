export type ChatAttachment = {
  url: string;
  mediaType: string;
  name: string;
  /** Multi-part Supabase paths for videos larger than the Free-tier single-upload cap. */
  storagePaths?: string[];
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
/** Max video size Posty accepts in chat. */
export const MAX_VIDEO_BYTES = 60 * 1024 * 1024;
/** Supabase Free single-upload cap — larger videos are split into parts. */
export const MAX_SUPABASE_VIDEO_BYTES = 50 * 1024 * 1024;
/** Keep each stored part small enough for Supabase resumable uploads. */
export const SUPABASE_VIDEO_CHUNK_BYTES = 6 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

export function isImageMediaType(mediaType: string): boolean {
  return ALLOWED_IMAGE_TYPES.has(mediaType);
}

export function isVideoMediaType(mediaType: string): boolean {
  return ALLOWED_VIDEO_TYPES.has(mediaType);
}

export function validateChatUploadFile(file: File): string | null {
  const mediaType = file.type.trim().toLowerCase();

  if (ALLOWED_IMAGE_TYPES.has(mediaType)) {
    if (file.size > MAX_IMAGE_BYTES) {
      return "image_too_large";
    }
    return null;
  }

  if (ALLOWED_VIDEO_TYPES.has(mediaType)) {
    if (file.size > MAX_VIDEO_BYTES) {
      return "video_too_large";
    }
    return null;
  }

  return "unsupported_type";
}

export function shouldUploadVideoChunked(fileSize: number): boolean {
  return fileSize > MAX_SUPABASE_VIDEO_BYTES;
}

/** @deprecated use shouldUploadVideoChunked */
export function shouldUploadVideoViaBlob(fileSize: number): boolean {
  return shouldUploadVideoChunked(fileSize);
}

export function sanitizeUploadFilename(name: string): string {
  const base = name.split(/[/\\]/).pop()?.trim() || "upload";
  const cleaned = base.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 120);
  return cleaned || "upload";
}

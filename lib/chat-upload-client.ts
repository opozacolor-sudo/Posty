import type { SupabaseClient } from "@supabase/supabase-js";
import {
  sanitizeUploadFilename,
  shouldUploadVideoChunked,
  SUPABASE_VIDEO_CHUNK_BYTES,
  validateChatUploadFile,
  type ChatAttachment,
} from "./chat-upload";
import { mapStorageUploadError, uploadBlobViaTus } from "./chat-upload-tus";

const CHAT_MEDIA_BUCKET = "chat-media";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }
  return url;
}

function inferMediaType(file: File): string {
  const declared = file.type.trim().toLowerCase();
  if (declared) {
    return declared;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "mp4") return "video/mp4";
  if (extension === "mov") return "video/quicktime";
  if (extension === "webm") return "video/webm";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";

  return declared;
}

async function createSignedAttachmentUrl(
  supabase: SupabaseClient,
  objectPath: string,
  mediaType: string,
  safeName: string,
): Promise<ChatAttachment> {
  const { data: signed, error: signError } = await supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);

  if (signError || !signed?.signedUrl) {
    throw new Error("signed_url_failed");
  }

  return {
    url: signed.signedUrl,
    mediaType,
    name: safeName,
  };
}

async function uploadVideoInChunks(
  supabase: SupabaseClient,
  supabaseUrl: string,
  userId: string,
  file: File,
  mediaType: string,
  safeName: string,
): Promise<ChatAttachment> {
  const sessionId = `${Date.now()}`;
  const storagePaths: string[] = [];
  let offset = 0;
  let partIndex = 0;

  while (offset < file.size) {
    const chunk = file.slice(offset, offset + SUPABASE_VIDEO_CHUNK_BYTES);
    const objectPath = `${userId}/chunks/${sessionId}/${partIndex}-${safeName}`;

    try {
      await uploadBlobViaTus(supabase, supabaseUrl, objectPath, chunk, mediaType);
    } catch (error) {
      throw new Error(mapStorageUploadError(error));
    }

    storagePaths.push(objectPath);
    offset += SUPABASE_VIDEO_CHUNK_BYTES;
    partIndex += 1;
  }

  return {
    url: URL.createObjectURL(file),
    mediaType,
    name: safeName,
    storagePaths,
  };
}

async function uploadVideoViaTus(
  supabase: SupabaseClient,
  supabaseUrl: string,
  userId: string,
  file: File,
  mediaType: string,
  safeName: string,
): Promise<ChatAttachment> {
  const objectPath = `${userId}/${Date.now()}-${safeName}`;

  try {
    await uploadBlobViaTus(supabase, supabaseUrl, objectPath, file, mediaType);
  } catch (error) {
    throw new Error(mapStorageUploadError(error));
  }

  return createSignedAttachmentUrl(supabase, objectPath, mediaType, safeName);
}

async function uploadImageViaSupabase(
  supabase: SupabaseClient,
  userId: string,
  file: File,
  mediaType: string,
  safeName: string,
): Promise<ChatAttachment> {
  const objectPath = `${userId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .upload(objectPath, file, {
      contentType: mediaType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(mapStorageUploadError(uploadError));
  }

  return createSignedAttachmentUrl(supabase, objectPath, mediaType, safeName);
}

export async function uploadChatAttachmentFromBrowser(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<ChatAttachment> {
  const mediaType = inferMediaType(file);
  const fileForValidation = new File([file], file.name, { type: mediaType });
  const validationError = validateChatUploadFile(fileForValidation);

  if (validationError) {
    throw new Error(validationError);
  }

  const safeName = sanitizeUploadFilename(file.name);
  const supabaseUrl = getSupabaseUrl();

  if (mediaType.startsWith("video/")) {
    if (shouldUploadVideoChunked(file.size)) {
      return uploadVideoInChunks(
        supabase,
        supabaseUrl,
        userId,
        file,
        mediaType,
        safeName,
      );
    }

    return uploadVideoViaTus(supabase, supabaseUrl, userId, file, mediaType, safeName);
  }

  return uploadImageViaSupabase(supabase, userId, file, mediaType, safeName);
}

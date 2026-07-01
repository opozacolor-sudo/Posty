import type { SupabaseClient } from "@supabase/supabase-js";
import { upload } from "@vercel/blob/client";
import { isVercelBlobConfigured } from "./blob-env";
import {
  sanitizeUploadFilename,
  shouldUploadVideoViaBlob,
  validateChatUploadFile,
  type ChatAttachment,
} from "./chat-upload";

const CHAT_MEDIA_BUCKET = "chat-media";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

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

async function uploadVideoViaBlob(
  userId: string,
  file: File,
  mediaType: string,
  safeName: string,
): Promise<ChatAttachment> {
  if (!isVercelBlobConfigured()) {
    throw new Error("blob_not_configured");
  }

  const objectPath = `${userId}/${Date.now()}-${safeName}`;
  const result = await upload(objectPath, file, {
    access: "public",
    handleUploadUrl: "/api/chat/upload/blob",
    clientPayload: JSON.stringify({ userId }),
    contentType: mediaType,
    multipart: file.size > 5 * 1024 * 1024,
  });

  return {
    url: result.url,
    mediaType,
    name: safeName,
  };
}

async function uploadViaSupabase(
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
    const message = uploadError.message.toLowerCase();
    if (message.includes("size") || message.includes("limit") || message.includes("large")) {
      if (isVercelBlobConfigured() && shouldUploadVideoViaBlob(file.size)) {
        return uploadVideoViaBlob(userId, file, mediaType, safeName);
      }
      throw new Error("storage_bucket_limit");
    }
    throw new Error("upload_failed");
  }

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

  if (mediaType.startsWith("video/") && shouldUploadVideoViaBlob(file.size)) {
    return uploadVideoViaBlob(userId, file, mediaType, safeName);
  }

  return uploadViaSupabase(supabase, userId, file, mediaType, safeName);
}

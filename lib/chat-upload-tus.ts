import * as tus from "tus-js-client";
import type { SupabaseClient } from "@supabase/supabase-js";

const CHAT_MEDIA_BUCKET = "chat-media";
export const TUS_UPLOAD_CHUNK_BYTES = 6 * 1024 * 1024;

function getResumableUploadEndpoint(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/upload/resumable`;
}

export async function uploadBlobViaTus(
  supabase: SupabaseClient,
  supabaseUrl: string,
  objectPath: string,
  blob: Blob,
  contentType: string,
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("unauthorized");
  }

  const endpoint = getResumableUploadEndpoint(supabaseUrl);

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(blob, {
      endpoint,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "x-upsert": "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: CHAT_MEDIA_BUCKET,
        objectName: objectPath,
        contentType,
        cacheControl: "3600",
      },
      chunkSize: TUS_UPLOAD_CHUNK_BYTES,
      onError: (error) => reject(error),
      onSuccess: () => resolve(),
    });

    void upload
      .findPreviousUploads()
      .then((previousUploads) => {
        if (previousUploads.length > 0) {
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }
        upload.start();
      })
      .catch(reject);
  });
}

export function mapStorageUploadError(error: unknown): string {
  const message =
    error instanceof Error
      ? `${error.message} ${(error as { originalResponse?: { getBody?: () => string } }).originalResponse?.getBody?.() ?? ""}`
      : String(error);

  const lower = message.toLowerCase();

  if (
    lower.includes("413") ||
    lower.includes("entitytoolarge") ||
    lower.includes("maximum size") ||
    lower.includes("max-file") ||
    lower.includes("too large") ||
    lower.includes("size") ||
    lower.includes("limit")
  ) {
    return "storage_bucket_limit";
  }

  if (lower.includes("unauthorized") || lower.includes("jwt")) {
    return "unauthorized";
  }

  console.error("[posty/chat-upload] storage error:", message);
  return "upload_failed";
}

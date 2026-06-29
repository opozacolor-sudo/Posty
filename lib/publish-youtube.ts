import { refreshGoogleAccessToken } from "./google-oauth";

type YouTubeApiError = {
  error?: { message?: string; errors?: Array<{ reason?: string }> };
  id?: string;
};

type YouTubeVideoResource = {
  id?: string;
  snippet?: {
    title?: string;
  };
  status?: {
    privacyStatus?: string;
    uploadStatus?: string;
    failureReason?: string;
    rejectReason?: string;
  };
  processingDetails?: {
    processingStatus?: string;
    processingFailureReason?: string;
  };
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function detectVideoContentType(bytes: Buffer, declaredType: string): string {
  if (bytes.length >= 12) {
    const box = bytes.subarray(4, 8).toString("ascii");
    if (box === "ftyp") {
      return "video/mp4";
    }

    if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
      return "video/webm";
    }
  }

  const normalized = declaredType.split(";")[0]?.trim().toLowerCase();
  if (normalized === "video/mp4" || normalized === "video/quicktime" || normalized === "video/webm") {
    return normalized === "video/quicktime" ? "video/mp4" : normalized;
  }

  return "video/mp4";
}

function validateVideoBytes(bytes: Buffer): string | null {
  if (bytes.length < 32 * 1024) {
    return "Video file is too small or incomplete (min ~32KB)";
  }

  const isMp4 = bytes.length >= 8 && bytes.subarray(4, 8).toString("ascii") === "ftyp";
  const isWebm =
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3;

  if (!isMp4 && !isWebm) {
    return "Video file is not a valid MP4/WebM container — re-export as MP4 and try again";
  }

  if (isWebm) {
    return "YouTube works best with MP4 (H.264). Re-export or attach an .mp4 file.";
  }

  return null;
}

function parseYouTubeUploadResponse(
  response: Response,
  bodyText: string,
): { ok: true; videoId: string } | { ok: false; error: string } {
  if (!response.ok) {
    try {
      const error = JSON.parse(bodyText) as YouTubeApiError;
      return {
        ok: false,
        error: error.error?.message ?? `YouTube video upload failed (${response.status})`,
      };
    } catch {
      return {
        ok: false,
        error: bodyText.trim() || `YouTube video upload failed (${response.status})`,
      };
    }
  }

  if (!bodyText.trim()) {
    return { ok: false, error: "YouTube upload returned empty response" };
  }

  try {
    const uploaded = JSON.parse(bodyText) as YouTubeVideoResource;
    if (!uploaded.id) {
      return { ok: false, error: "YouTube upload completed without video id" };
    }

    return { ok: true, videoId: uploaded.id };
  } catch {
    return { ok: false, error: "YouTube upload returned invalid JSON" };
  }
}

async function fetchYouTubeVideoResource(
  accessToken: string,
  videoId: string,
): Promise<
  | { ok: true; video: YouTubeVideoResource }
  | { ok: false; error: string }
  | { ok: false; notFound: true }
> {
  const response = await fetch(
    "https://www.googleapis.com/youtube/v3/videos?" +
      new URLSearchParams({
        part: "status,processingDetails,snippet",
        id: videoId,
      }),
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  const data = (await response.json()) as {
    items?: YouTubeVideoResource[];
    error?: { message?: string };
  };

  if (!response.ok) {
    return {
      ok: false,
      error: data.error?.message ?? "Could not verify YouTube upload",
    };
  }

  const video = data.items?.[0];
  if (!video) {
    return { ok: false, notFound: true };
  }

  return { ok: true, video };
}

async function waitForYouTubeProcessing(
  accessToken: string,
  videoId: string,
): Promise<{ ok: true; detail: string } | { ok: false; error: string }> {
  const studioUrl = `https://studio.youtube.com/video/${videoId}/edit`;
  const maxAttempts = 16;
  const delayMs = 4000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const fetched = await fetchYouTubeVideoResource(accessToken, videoId);

    if (!fetched.ok) {
      if ("notFound" in fetched && fetched.notFound) {
        if (attempt < 4) {
          await sleep(delayMs);
          continue;
        }

        return {
          ok: false,
          error: `YouTube removed the upload during processing. Check Studio: ${studioUrl}`,
        };
      }

      return { ok: false, error: "error" in fetched ? fetched.error : "Could not verify YouTube upload" };
    }

    const video = fetched.video;
    const uploadStatus = video.status?.uploadStatus;
    const processingStatus = video.processingDetails?.processingStatus;
    const failureReason =
      video.processingDetails?.processingFailureReason ??
      video.status?.failureReason ??
      video.status?.rejectReason;

    if (
      uploadStatus === "failed" ||
      uploadStatus === "rejected" ||
      uploadStatus === "deleted" ||
      processingStatus === "failed" ||
      processingStatus === "terminated"
    ) {
      return {
        ok: false,
        error: `YouTube rejected the video${failureReason ? ` (${failureReason})` : ""}. Studio: ${studioUrl}`,
      };
    }

    const isProcessed =
      uploadStatus === "processed" ||
      processingStatus === "succeeded" ||
      (uploadStatus === "uploaded" && processingStatus == null);

    if (isProcessed) {
      const watchUrl = `https://youtu.be/${videoId}`;
      const privacyStatus = video.status?.privacyStatus;
      const title = video.snippet?.title?.trim();
      const notes: string[] = [watchUrl];

      if (title) {
        notes.push(`titlu: ${title}`);
      }

      if (privacyStatus === "private") {
        notes.push("vizibilitate: privat (doar tu îl vezi pe canal)");
      } else if (privacyStatus === "unlisted") {
        notes.push("vizibilitate: nelistat");
      } else {
        notes.push("live pe canal");
      }

      return { ok: true, detail: notes.join(" · ") };
    }

    if (attempt < maxAttempts - 1) {
      await sleep(delayMs);
    }
  }

  return {
    ok: false,
    error: `YouTube încă procesează după 60s — verifică manual în Studio: ${studioUrl}`,
  };
}

function splitCaption(caption: string): { title: string; description: string } {
  const trimmed = caption.trim();
  const firstLine = trimmed.split("\n")[0]?.trim() || "Posty video";
  return {
    title: firstLine.slice(0, 100),
    description: trimmed.slice(0, 5000),
  };
}

async function uploadVideoToYouTube(
  accessToken: string,
  videoBytes: Buffer,
  contentType: string,
  caption: string,
): Promise<{ ok: true; videoId: string } | { ok: false; error: string }> {
  const validationError = validateVideoBytes(videoBytes);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const uploadContentType = detectVideoContentType(videoBytes, contentType);
  const { title, description } = splitCaption(caption);

  console.log(
    "[posty/youtube] upload start:",
    JSON.stringify({
      bytes: videoBytes.length,
      contentType: uploadContentType,
      title,
    }),
  );

  const initResponse = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?" +
      new URLSearchParams({
        uploadType: "resumable",
        part: "snippet,status,processingDetails",
      }),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": uploadContentType,
        "X-Upload-Content-Length": String(videoBytes.length),
      },
      body: JSON.stringify({
        snippet: {
          title,
          description,
          categoryId: "22",
        },
        status: {
          privacyStatus: "public",
          selfDeclaredMadeForKids: false,
          embeddable: true,
          license: "youtube",
        },
      }),
    },
  );

  if (!initResponse.ok) {
    const error = (await initResponse.json()) as YouTubeApiError;
    return {
      ok: false,
      error: error.error?.message ?? "YouTube upload initialization failed",
    };
  }

  const uploadUrl = initResponse.headers.get("Location");
  if (!uploadUrl) {
    return { ok: false, error: "YouTube did not return an upload URL" };
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": uploadContentType,
      "Content-Length": String(videoBytes.length),
    },
    body: new Uint8Array(videoBytes),
  });

  const bodyText = await uploadResponse.text();
  const parsed = parseYouTubeUploadResponse(uploadResponse, bodyText);

  if (parsed.ok) {
    console.log("[posty/youtube] upload accepted:", parsed.videoId);
  }

  return parsed;
}

async function uploadAndVerifyYouTubeVideo(
  accessToken: string,
  videoBytes: Buffer,
  contentType: string,
  caption: string,
): Promise<
  | { ok: true; videoId: string; detail: string }
  | { ok: false; error: string }
> {
  const uploaded = await uploadVideoToYouTube(
    accessToken,
    videoBytes,
    contentType,
    caption,
  );

  if (!uploaded.ok) {
    return uploaded;
  }

  const verified = await waitForYouTubeProcessing(accessToken, uploaded.videoId);
  if (!verified.ok) {
    return verified;
  }

  return {
    ok: true,
    videoId: uploaded.videoId,
    detail: verified.detail,
  };
}

export async function publishYouTubeVideo(options: {
  accessToken: string;
  refreshToken?: string | null;
  caption: string;
  videoBytes: Buffer;
  contentType: string;
}): Promise<
  | { ok: true; postId: string; detail?: string }
  | { ok: false; error: string }
> {
  try {
    let accessToken = options.accessToken;
    let result = await uploadAndVerifyYouTubeVideo(
      accessToken,
      options.videoBytes,
      options.contentType,
      options.caption,
    );

    const shouldRefresh =
      !result.ok &&
      options.refreshToken &&
      /401|Invalid Credentials|invalid authentication credentials/i.test(result.error);

    if (shouldRefresh && options.refreshToken) {
      const refreshed = await refreshGoogleAccessToken(options.refreshToken);
      accessToken = refreshed.accessToken;
      result = await uploadAndVerifyYouTubeVideo(
        accessToken,
        options.videoBytes,
        options.contentType,
        options.caption,
      );
    }

    return result.ok
      ? { ok: true, postId: result.videoId, detail: result.detail }
      : { ok: false, error: result.error };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

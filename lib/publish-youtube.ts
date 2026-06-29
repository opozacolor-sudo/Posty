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
  };
  processingDetails?: {
    processingStatus?: string;
    processingFailureReason?: string;
  };
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function verifyYouTubeVideo(
  accessToken: string,
  videoId: string,
): Promise<{ ok: true; detail: string } | { ok: false; error: string }> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
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
      if (attempt < 3) {
        await sleep(2000);
        continue;
      }

      return {
        ok: false,
        error:
          "Upload reported success but video not found on connected channel — check YouTube Studio > Content",
      };
    }

    const failureReason =
      video.processingDetails?.processingFailureReason ??
      video.status?.failureReason;

    if (failureReason) {
      return { ok: false, error: `YouTube processing failed (${failureReason})` };
    }

    const watchUrl = `https://youtu.be/${videoId}`;
    const processingStatus = video.processingDetails?.processingStatus;
    const privacyStatus = video.status?.privacyStatus;
    const title = video.snippet?.title?.trim();

    const notes: string[] = [watchUrl];

    if (title) {
      notes.push(`titlu: ${title}`);
    }

    if (processingStatus === "processing") {
      notes.push("YouTube încă procesează — apare în Studio în 1-10 minute");
    } else if (privacyStatus === "private") {
      notes.push("vizibilitate: privat");
    } else if (privacyStatus === "unlisted") {
      notes.push("vizibilitate: nelistat");
    }

    return { ok: true, detail: notes.join(" · ") };
  }

  return { ok: false, error: "Could not verify YouTube upload" };
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
  const { title, description } = splitCaption(caption);

  const initResponse = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?" +
      new URLSearchParams({
        uploadType: "resumable",
        part: "snippet,status",
      }),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": contentType,
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
      "Content-Type": contentType,
      "Content-Length": String(videoBytes.length),
    },
    body: new Uint8Array(videoBytes),
  });

  const bodyText = await uploadResponse.text();
  return parseYouTubeUploadResponse(uploadResponse, bodyText);
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

  const verified = await verifyYouTubeVideo(accessToken, uploaded.videoId);
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

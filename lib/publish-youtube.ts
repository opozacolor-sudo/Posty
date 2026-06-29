import { refreshGoogleAccessToken } from "./google-oauth";

type YouTubeApiError = {
  error?: { message?: string; errors?: Array<{ reason?: string }> };
  id?: string;
};

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

  const uploaded = (await uploadResponse.json()) as YouTubeApiError;

  if (!uploadResponse.ok || !uploaded.id) {
    return {
      ok: false,
      error: uploaded.error?.message ?? "YouTube video upload failed",
    };
  }

  return { ok: true, videoId: uploaded.id };
}

export async function publishYouTubeVideo(options: {
  accessToken: string;
  refreshToken?: string | null;
  caption: string;
  videoBytes: Buffer;
  contentType: string;
}): Promise<{ ok: true; postId: string } | { ok: false; error: string }> {
  try {
    let accessToken = options.accessToken;
    let result = await uploadVideoToYouTube(
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
      result = await uploadVideoToYouTube(
        accessToken,
        options.videoBytes,
        options.contentType,
        options.caption,
      );
    }

    return result.ok
      ? { ok: true, postId: result.videoId }
      : { ok: false, error: result.error };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

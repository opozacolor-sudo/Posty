import { refreshGoogleAccessToken } from "./google-business-oauth";

type LocalPostResponse = {
  name?: string;
  searchUrl?: string;
  error?: { message?: string; status?: string; code?: number };
};

function truncateSummary(caption: string): string {
  const trimmed = caption.trim();
  if (trimmed.length <= 1500) {
    return trimmed;
  }

  return `${trimmed.slice(0, 1497)}...`;
}

function resolveLanguageCode(caption: string): string {
  return /[ăâîșțĂÂÎȘȚ]/.test(caption) ? "ro" : "en";
}

export async function publishGoogleBusinessLocalPost(options: {
  accessToken: string;
  refreshToken?: string | null;
  locationName: string;
  caption: string;
  imageUrl: string;
}): Promise<
  | { ok: true; postId: string; detail?: string }
  | { ok: false; error: string }
> {
  const parent = options.locationName.startsWith("accounts/")
    ? options.locationName
    : `accounts/${options.locationName}`;

  async function createPost(accessToken: string) {
    const response = await fetch(
      `https://mybusiness.googleapis.com/v4/${parent}/localPosts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          languageCode: resolveLanguageCode(options.caption),
          summary: truncateSummary(options.caption),
          topicType: "STANDARD",
          media: [
            {
              mediaFormat: "PHOTO",
              sourceUrl: options.imageUrl,
            },
          ],
        }),
      },
    );

    const data = (await response.json()) as LocalPostResponse;

    if (!response.ok) {
      const message =
        data.error?.message ??
        `Google Business post failed (${response.status})`;

      if (/quota|permission|access|not enabled|API has not been used/i.test(message)) {
        return {
          ok: false as const,
          error:
            "Google Business Profile API access not approved yet — apply via Google GBP API contact form (see docs/app-review/07-google-business-profile.md)",
        };
      }

      return { ok: false as const, error: message };
    }

    return {
      ok: true as const,
      postId: data.name ?? "google-business-post",
      detail: data.searchUrl ?? undefined,
    };
  }

  try {
    let result = await createPost(options.accessToken);

    const shouldRefresh =
      !result.ok &&
      options.refreshToken &&
      /401|Invalid Credentials|invalid authentication credentials/i.test(result.error);

    if (shouldRefresh && options.refreshToken) {
      const refreshed = await refreshGoogleAccessToken(options.refreshToken);
      result = await createPost(refreshed.accessToken);
    }

    return result;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

type LinkedInError = {
  message?: string;
  status?: number;
};

const LINKEDIN_API_VERSION = "202405";

function linkedInHeaders(
  accessToken: string,
  contentType?: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "LinkedIn-Version": LINKEDIN_API_VERSION,
    "X-Restli-Protocol-Version": "2.0.0",
  };

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  return headers;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveLinkedInPersonUrn(accessToken: string): Promise<string> {
  const response = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await response.json()) as { sub?: string; message?: string };

  if (!response.ok || !data.sub) {
    throw new Error(data.message ?? "Could not resolve LinkedIn member id");
  }

  return `urn:li:person:${data.sub}`;
}

function linkedInErrorMessage(data: LinkedInError, fallback: string): string {
  return data.message ?? fallback;
}

function normalizeLinkedInEtag(etag: string): string {
  return etag.replace(/^"|"$/g, "").trim();
}

async function waitForLinkedInVideoAvailable(
  accessToken: string,
  videoUrn: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const maxAttempts = 30;
  const delayMs = 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(
      `https://api.linkedin.com/rest/videos/${encodeURIComponent(videoUrn)}`,
      { headers: linkedInHeaders(accessToken) },
    );
    const data = (await response.json()) as LinkedInError & { status?: string };

    if (!response.ok) {
      return {
        ok: false,
        error: linkedInErrorMessage(data, "LinkedIn video status check failed"),
      };
    }

    if (data.status === "AVAILABLE") {
      return { ok: true };
    }

    if (data.status === "PROCESSING_FAILED" || data.status === "FAILED") {
      return {
        ok: false,
        error: `LinkedIn video processing failed (${data.status})`,
      };
    }

    if (attempt < maxAttempts - 1) {
      await sleep(delayMs);
    }
  }

  return {
    ok: false,
    error: "LinkedIn video processing timed out — try again in a moment",
  };
}

async function uploadLinkedInVideoAsset(options: {
  accessToken: string;
  owner: string;
  videoBytes: Buffer;
}): Promise<{ ok: true; videoUrn: string } | { ok: false; error: string }> {
  const initResponse = await fetch(
    "https://api.linkedin.com/rest/videos?action=initializeUpload",
    {
      method: "POST",
      headers: linkedInHeaders(options.accessToken, "application/json"),
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: options.owner,
          fileSizeBytes: options.videoBytes.length,
          uploadCaptions: false,
          uploadThumbnail: false,
        },
      }),
    },
  );

  const initData = (await initResponse.json()) as LinkedInError & {
    value?: {
      video?: string;
      uploadToken?: string;
      uploadInstructions?: Array<{
        uploadUrl?: string;
        firstByte?: number;
        lastByte?: number;
      }>;
    };
  };

  const videoUrn = initData.value?.video;
  const uploadInstructions = initData.value?.uploadInstructions ?? [];

  if (!initResponse.ok || !videoUrn || uploadInstructions.length === 0) {
    return {
      ok: false,
      error:
        linkedInErrorMessage(initData, "LinkedIn video upload registration failed") +
        " — reconnect with post permission (w_member_social)",
    };
  }

  const uploadedPartIds: string[] = [];

  for (const instruction of uploadInstructions) {
    const uploadUrl = instruction.uploadUrl;
    const firstByte = instruction.firstByte ?? 0;
    const lastByte = instruction.lastByte ?? options.videoBytes.length - 1;

    if (!uploadUrl) {
      return { ok: false, error: "LinkedIn video upload URL missing" };
    }

    const chunk = options.videoBytes.subarray(firstByte, lastByte + 1);
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: new Uint8Array(chunk),
    });

    if (!uploadResponse.ok) {
      return { ok: false, error: "LinkedIn video part upload failed" };
    }

    const etag = uploadResponse.headers.get("etag");
    if (!etag) {
      return { ok: false, error: "LinkedIn video upload missing ETag" };
    }

    uploadedPartIds.push(normalizeLinkedInEtag(etag));
  }

  const finalizeResponse = await fetch(
    "https://api.linkedin.com/rest/videos?action=finalizeUpload",
    {
      method: "POST",
      headers: linkedInHeaders(options.accessToken, "application/json"),
      body: JSON.stringify({
        finalizeUploadRequest: {
          video: videoUrn,
          uploadToken: initData.value?.uploadToken ?? "",
          uploadedPartIds,
        },
      }),
    },
  );

  if (!finalizeResponse.ok) {
    const finalizeData = (await finalizeResponse.json()) as LinkedInError;
    return {
      ok: false,
      error: linkedInErrorMessage(finalizeData, "LinkedIn video finalize failed"),
    };
  }

  const ready = await waitForLinkedInVideoAvailable(options.accessToken, videoUrn);
  if (!ready.ok) {
    return ready;
  }

  return { ok: true, videoUrn };
}

async function publishLinkedInVideoPost(options: {
  accessToken: string;
  owner: string;
  caption: string;
  videoUrn: string;
}): Promise<{ ok: true; postId: string } | { ok: false; error: string }> {
  const postResponse = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: linkedInHeaders(options.accessToken, "application/json"),
    body: JSON.stringify({
      author: options.owner,
      commentary: options.caption,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      content: {
        media: {
          title: options.caption.slice(0, 100),
          id: options.videoUrn,
        },
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });

  const postId = postResponse.headers.get("x-restli-id");
  if (!postResponse.ok || !postId) {
    const postData = (await postResponse.json()) as LinkedInError;
    return {
      ok: false,
      error: linkedInErrorMessage(postData, "LinkedIn video post publish failed"),
    };
  }

  return { ok: true, postId };
}

export async function publishLinkedInContent(options: {
  accessToken: string;
  caption: string;
  mediaType: "image" | "video";
  imageUrl?: string | null;
  videoBytes?: Buffer;
}): Promise<{ ok: true; postId: string; detail?: string } | { ok: false; error: string }> {
  try {
    const owner = await resolveLinkedInPersonUrn(options.accessToken);

    if (options.mediaType === "video") {
      if (!options.videoBytes?.length) {
        return { ok: false, error: "linkedin needs a video attached with 📎" };
      }

      const uploaded = await uploadLinkedInVideoAsset({
        accessToken: options.accessToken,
        owner,
        videoBytes: options.videoBytes,
      });

      if (!uploaded.ok) {
        return uploaded;
      }

      const published = await publishLinkedInVideoPost({
        accessToken: options.accessToken,
        owner,
        caption: options.caption,
        videoUrn: uploaded.videoUrn,
      });

      return published.ok
        ? { ok: true, postId: published.postId, detail: "video pe LinkedIn" }
        : published;
    }

    if (!options.imageUrl) {
      return { ok: false, error: "linkedin needs a photo attached with 📎" };
    }

    const imageResult = await publishLinkedInImagePost({
      accessToken: options.accessToken,
      caption: options.caption,
      imageUrl: options.imageUrl,
    });

    return imageResult;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function publishLinkedInImagePost(options: {
  accessToken: string;
  caption: string;
  imageUrl: string;
}): Promise<{ ok: true; postId: string } | { ok: false; error: string }> {
  try {
    const owner = await resolveLinkedInPersonUrn(options.accessToken);

    const imageResponse = await fetch(options.imageUrl);
    if (!imageResponse.ok) {
      return { ok: false, error: "Could not download image for LinkedIn upload" };
    }

    const imageBytes = Buffer.from(await imageResponse.arrayBuffer());
    const contentType =
      imageResponse.headers.get("content-type") ?? "image/jpeg";

    const registerResponse = await fetch(
      "https://api.linkedin.com/v2/assets?action=registerUpload",
      {
        method: "POST",
        headers: linkedInHeaders(options.accessToken, "application/json"),
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
            owner,
            serviceRelationships: [
              {
                relationshipType: "OWNER",
                identifier: "urn:li:userGeneratedContent",
              },
            ],
          },
        }),
      },
    );

    const registerData = (await registerResponse.json()) as {
      value?: {
        asset?: string;
        uploadMechanism?: {
          "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"?: {
            uploadUrl?: string;
          };
        };
      };
      message?: string;
    };

    const uploadUrl =
      registerData.value?.uploadMechanism?.[
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
      ]?.uploadUrl;
    const asset = registerData.value?.asset;

    if (!registerResponse.ok || !uploadUrl || !asset) {
      return {
        ok: false,
        error:
          registerData.message ??
          "LinkedIn image upload registration failed — reconnect with post permission (w_member_social)",
      };
    }

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        "Content-Type": contentType,
      },
      body: imageBytes,
    });

    if (!uploadResponse.ok) {
      return { ok: false, error: "LinkedIn image upload failed" };
    }

    const postResponse = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: linkedInHeaders(options.accessToken, "application/json"),
      body: JSON.stringify({
        author: owner,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: options.caption },
            shareMediaCategory: "IMAGE",
            media: [
              {
                status: "READY",
                description: { text: options.caption.slice(0, 200) },
                media: asset,
                title: { text: options.caption.slice(0, 100) },
              },
            ],
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      }),
    });

    const postData = (await postResponse.json()) as LinkedInError & { id?: string };

    if (!postResponse.ok || !postData.id) {
      return {
        ok: false,
        error: linkedInErrorMessage(postData, "LinkedIn post publish failed"),
      };
    }

    return { ok: true, postId: postData.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

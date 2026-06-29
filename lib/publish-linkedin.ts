type LinkedInError = {
  message?: string;
  status?: number;
};

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
        headers: {
          Authorization: `Bearer ${options.accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
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
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
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
        error: postData.message ?? "LinkedIn post publish failed",
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

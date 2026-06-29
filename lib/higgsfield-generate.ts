import { createHiggsfieldClient, type V2Response } from "@higgsfield/client/v2";
import { getHiggsfieldCredentials, isHiggsfieldConfigured } from "./higgsfield-env";

/** CLI default: gpt_image_2 → flux kontext for server SDK */
const DEFAULT_IMAGE_ENDPOINT = "flux-pro/kontext/max/text-to-image";

export type GenerateImageOptions = {
  prompt: string;
  aspectRatio?: "1:1" | "9:16" | "16:9" | "4:5";
};

export type GenerateImageResult = {
  url: string;
  thumbnailUrl?: string;
  requestId?: string;
};

function getClient() {
  const credentials = getHiggsfieldCredentials();
  if (!credentials) {
    throw new Error("HIGGSFIELD_NOT_CONFIGURED");
  }

  return createHiggsfieldClient({
    credentials,
    maxPollTime: 120_000,
    pollInterval: 3000,
  });
}

export function extractMediaUrl(response: V2Response): GenerateImageResult | null {
  if (response.status === "nsfw") {
    throw new Error("HIGGSFIELD_NSFW");
  }
  if (response.status === "failed") {
    throw new Error("HIGGSFIELD_FAILED");
  }
  if (response.status !== "completed") {
    throw new Error("HIGGSFIELD_INCOMPLETE");
  }

  const url = response.images?.[0]?.url ?? response.video?.url;
  if (!url) {
    throw new Error("HIGGSFIELD_NO_URL");
  }

  return { url, requestId: response.request_id };
}

export async function generateHiggsfieldImage(
  options: GenerateImageOptions,
): Promise<GenerateImageResult> {
  if (!isHiggsfieldConfigured()) {
    throw new Error("HIGGSFIELD_NOT_CONFIGURED");
  }

  const client = getClient();
  const endpoint =
    process.env.HIGGSFIELD_IMAGE_ENDPOINT?.trim() || DEFAULT_IMAGE_ENDPOINT;

  const response = await client.subscribe(endpoint, {
    input: {
      prompt: options.prompt,
      aspect_ratio: options.aspectRatio ?? "1:1",
      safety_tolerance: 2,
    },
    withPolling: true,
  });

  const result = extractMediaUrl(response);
  if (!result) {
    throw new Error("HIGGSFIELD_NO_URL");
  }

  return result;
}

export function userWantsImageGeneration(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    /\b(genereaz[aă]|creeaz[aă]|f[aă])\b.*\b(imagine|poz[aă]|photo|image|grafic)\b/i.test(
      message,
    ) ||
    /\b(make|create|generate)\b.*\b(image|photo|picture)\b/i.test(lower) ||
    /\b(imagine|poz[aă])\b.*\b(pentru|for|on)\b/i.test(lower)
  );
}

export function userWantsVideoGeneration(message: string): boolean {
  return (
    /\b(genereaz[aă]|creeaz[aă]|f[aă])\b.*\b(video|clip|reel)\b/i.test(message) ||
    /\b(make|create|generate)\b.*\b(video|clip|reel)\b/i.test(message.toLowerCase())
  );
}

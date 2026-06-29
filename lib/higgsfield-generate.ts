import { createHiggsfieldClient, type V2Response } from "@higgsfield/client/v2";
import { generateHiggsfieldImageViaCli } from "./higgsfield-cli";
import { getHiggsfieldClientConfig } from "./higgsfield-intent";
import {
  isHiggsfieldCliEnabled,
  isHiggsfieldSdkConfigured,
} from "./higgsfield-env";

/** Documented Platform API path (see @higgsfield/client README). */
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
  const creds = getHiggsfieldClientConfig();
  if (!creds) {
    throw new Error("HIGGSFIELD_NOT_CONFIGURED");
  }

  return createHiggsfieldClient({
    apiKey: creds.apiKey,
    apiSecret: creds.apiSecret,
    maxPollTime: 110_000,
    pollInterval: 2500,
    timeout: 30_000,
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

function buildSdkInput(
  endpoint: string,
  options: GenerateImageOptions,
): Record<string, string | number> {
  const input: Record<string, string | number> = {
    prompt: options.prompt,
    aspect_ratio: options.aspectRatio ?? "1:1",
  };

  if (endpoint.includes("flux-pro/kontext")) {
    input.safety_tolerance = 6;
    return input;
  }

  if (endpoint.includes("nano_banana") || endpoint.includes("gpt_image")) {
    input.resolution = process.env.HIGGSFIELD_IMAGE_RESOLUTION?.trim() || "2k";
  }

  if (endpoint.includes("flux") && !endpoint.includes("nano_banana")) {
    input.safety_tolerance = 6;
  }

  return input;
}

async function generateHiggsfieldImageViaSdk(
  options: GenerateImageOptions,
): Promise<GenerateImageResult> {
  if (!isHiggsfieldSdkConfigured()) {
    throw new Error("HIGGSFIELD_NOT_CONFIGURED");
  }

  const client = getClient();
  const endpoint =
    process.env.HIGGSFIELD_IMAGE_ENDPOINT?.trim() || DEFAULT_IMAGE_ENDPOINT;

  const response = await client.subscribe(endpoint, {
    input: buildSdkInput(endpoint, options),
    withPolling: true,
  });

  const result = extractMediaUrl(response);
  if (!result) {
    throw new Error("HIGGSFIELD_NO_URL");
  }

  return result;
}

export async function generateHiggsfieldImage(
  options: GenerateImageOptions,
): Promise<GenerateImageResult> {
  if (isHiggsfieldSdkConfigured()) {
    return generateHiggsfieldImageViaSdk(options);
  }

  if (isHiggsfieldCliEnabled()) {
    return generateHiggsfieldImageViaCli(options);
  }

  throw new Error("HIGGSFIELD_NOT_CONFIGURED");
}

export {
  buildImagePromptFromMessage,
  formatHiggsfieldError,
  resolveImageGenerationIntent,
  userWantsImageGeneration,
  userWantsVideoGeneration,
} from "./higgsfield-intent";

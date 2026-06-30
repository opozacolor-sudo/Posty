import { PLATFORMS, type SocialPlatform } from "./dashboard-data";

export type CapabilityLevel = "live" | "review" | "soon" | "none";

export type PlatformCapabilities = {
  oauth: CapabilityLevel;
  photo: CapabilityLevel;
  video: CapabilityLevel;
  scheduling: boolean;
};

export const PLATFORM_CAPABILITIES: Record<SocialPlatform, PlatformCapabilities> = {
  instagram: {
    oauth: "live",
    photo: "live",
    video: "none",
    scheduling: true,
  },
  threads: {
    oauth: "live",
    photo: "live",
    video: "none",
    scheduling: true,
  },
  linkedin: {
    oauth: "live",
    photo: "live",
    video: "none",
    scheduling: true,
  },
  youtube: {
    oauth: "live",
    photo: "none",
    video: "live",
    scheduling: true,
  },
  tiktok: {
    oauth: "live",
    photo: "none",
    video: "review",
    scheduling: true,
  },
  facebook: {
    oauth: "live",
    photo: "review",
    video: "review",
    scheduling: true,
  },
  pinterest: {
    oauth: "live",
    photo: "review",
    video: "none",
    scheduling: true,
  },
  x: {
    oauth: "soon",
    photo: "soon",
    video: "soon",
    scheduling: false,
  },
  bluesky: {
    oauth: "soon",
    photo: "soon",
    video: "soon",
    scheduling: false,
  },
};

export function canConnectPlatform(platform: SocialPlatform): boolean {
  return PLATFORM_CAPABILITIES[platform].oauth === "live";
}

export function getPlatformPublishStatus(platform: SocialPlatform): CapabilityLevel {
  const capabilities = PLATFORM_CAPABILITIES[platform];

  if (capabilities.oauth === "soon") {
    return "soon";
  }

  const levels = [capabilities.photo, capabilities.video];

  if (levels.includes("live")) {
    return "live";
  }

  if (levels.includes("review")) {
    return "review";
  }

  return "soon";
}

export function getLivePublishPlatforms(): SocialPlatform[] {
  return PLATFORMS.filter((platform) => getPlatformPublishStatus(platform) === "live");
}

export function getReviewPendingPlatforms(): SocialPlatform[] {
  return PLATFORMS.filter((platform) => getPlatformPublishStatus(platform) === "review");
}

export function getComingSoonPlatforms(): SocialPlatform[] {
  return PLATFORMS.filter((platform) => getPlatformPublishStatus(platform) === "soon");
}

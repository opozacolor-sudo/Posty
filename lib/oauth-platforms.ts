import type { SocialPlatform } from "./dashboard-data";
import { buildTikTokConnectPath } from "./tiktok-oauth";

export const OAUTH_CONNECT_PLATFORMS: SocialPlatform[] = [
  "instagram",
  "youtube",
  "facebook",
  "threads",
  "tiktok",
  "linkedin",
  "pinterest",
];

export function getPlatformConnectHref(
  platform: SocialPlatform,
  locale: string,
): string | null {
  if (platform === "x" || platform === "bluesky") {
    return null;
  }

  if (platform === "tiktok") {
    return buildTikTokConnectPath(locale, "basic");
  }

  return buildConnectUrl(platform, locale);
}

export function buildConnectUrl(platform: SocialPlatform, locale: string): string {
  return `/api/auth/${platform}?locale=${encodeURIComponent(locale)}`;
}

export const INSTAGRAM_OAUTH_PATH = "/api/auth/instagram";
export const YOUTUBE_OAUTH_PATH = "/api/auth/youtube";

export function getOAuthPath(platform: SocialPlatform): string {
  return `/api/auth/${platform}`;
}

export function buildOAuthUrl(path: string, locale: string): string {
  return `${path}?locale=${encodeURIComponent(locale)}`;
}

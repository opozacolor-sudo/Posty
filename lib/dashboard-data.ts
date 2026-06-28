export type SocialPlatform =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "linkedin"
  | "threads"
  | "x"
  | "pinterest"
  | "bluesky";

export type ConnectedAccount = {
  platform: SocialPlatform;
  connected: boolean;
  accountName?: string;
};

export type ScheduledPost = {
  id: string;
  platform: SocialPlatform;
  title: string;
  scheduledAt: string;
  thumbnailColor: string;
};

export type PlatformStats = {
  platform: SocialPlatform;
  views: number;
  likes: number;
  comments: number;
};

export const PLATFORMS: SocialPlatform[] = [
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "linkedin",
  "threads",
  "x",
  "pinterest",
  "bluesky",
];

export const MOCK_CONNECTED_ACCOUNTS: ConnectedAccount[] = PLATFORMS.map(
  (platform) => ({ platform, connected: false }),
);

export const MOCK_UPCOMING_POSTS: ScheduledPost[] = [
  {
    id: "1",
    platform: "instagram",
    title: "Summer collection launch 🌞",
    scheduledAt: "2026-06-28T14:00:00",
    thumbnailColor: "#FF375F",
  },
  {
    id: "2",
    platform: "tiktok",
    title: "Behind the scenes reel",
    scheduledAt: "2026-06-28T18:30:00",
    thumbnailColor: "#30D158",
  },
  {
    id: "3",
    platform: "linkedin",
    title: "Weekly industry insights",
    scheduledAt: "2026-06-29T09:00:00",
    thumbnailColor: "#0077B5",
  },
  {
    id: "4",
    platform: "instagram",
    title: "Customer testimonial carousel",
    scheduledAt: "2026-06-30T12:00:00",
    thumbnailColor: "#FF375F",
  },
  {
    id: "5",
    platform: "youtube",
    title: "Product tutorial — Part 2",
    scheduledAt: "2026-07-01T16:00:00",
    thumbnailColor: "#FF0000",
  },
];

export const MOCK_PLATFORM_STATS: PlatformStats[] = [
  { platform: "instagram", views: 12400, likes: 892, comments: 156 },
  { platform: "tiktok", views: 45200, likes: 3200, comments: 412 },
  { platform: "youtube", views: 8900, likes: 445, comments: 89 },
  { platform: "facebook", views: 5600, likes: 234, comments: 67 },
  { platform: "linkedin", views: 3200, likes: 178, comments: 45 },
  { platform: "threads", views: 1800, likes: 92, comments: 23 },
  { platform: "x", views: 7600, likes: 412, comments: 98 },
  { platform: "pinterest", views: 4100, likes: 256, comments: 34 },
  { platform: "bluesky", views: 2200, likes: 145, comments: 28 },
];

export const MOCK_SCHEDULED_DAYS = [3, 8, 12, 15, 18, 22, 28, 29, 30];

export function getDisplayName(
  email: string,
  fullName?: string | null,
): string {
  if (fullName?.trim()) return fullName.trim();
  return email.split("@")[0] || email;
}

export function getInitials(name: string): string {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

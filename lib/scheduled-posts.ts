import { PLATFORM_COLORS } from "@/components/dashboard/platform-icon";
import type { ScheduledPost, SocialPlatform } from "./dashboard-data";
import { PLATFORMS } from "./dashboard-data";
import type { createClient } from "./supabase-server";

export type ScheduledPostRow = {
  id: string;
  user_id: string;
  platform: string;
  title: string;
  caption: string | null;
  scheduled_at: string;
  media_url: string | null;
  status: string;
  created_at: string;
};

export type CreateScheduledPostInput = {
  platform: SocialPlatform;
  title: string;
  caption?: string | null;
  scheduledAt: string;
  mediaUrl?: string | null;
};

function isSocialPlatform(value: string): value is SocialPlatform {
  return PLATFORMS.includes(value as SocialPlatform);
}

export function rowToScheduledPost(row: ScheduledPostRow): ScheduledPost {
  const platform = isSocialPlatform(row.platform) ? row.platform : "instagram";

  return {
    id: row.id,
    platform,
    title: row.title,
    scheduledAt: row.scheduled_at,
    thumbnailColor: PLATFORM_COLORS[platform],
  };
}

export async function fetchUpcomingScheduledPosts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  limit = 20,
): Promise<ScheduledPost[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("scheduled_posts")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "scheduled")
    .gte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[posty/scheduled-posts] fetch failed:", error.message);
    return [];
  }

  return (data as ScheduledPostRow[]).map(rowToScheduledPost);
}

export async function createScheduledPost(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  input: CreateScheduledPostInput,
): Promise<ScheduledPost | null> {
  const scheduledAt = new Date(input.scheduledAt);

  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error("invalid_scheduled_at");
  }

  if (scheduledAt.getTime() <= Date.now()) {
    throw new Error("scheduled_at_in_past");
  }

  const { data, error } = await supabase
    .from("scheduled_posts")
    .insert({
      user_id: userId,
      platform: input.platform,
      title: input.title.slice(0, 120),
      caption: input.caption?.slice(0, 5000) ?? null,
      scheduled_at: scheduledAt.toISOString(),
      media_url: input.mediaUrl ?? null,
      status: "scheduled",
    })
    .select("*")
    .single();

  if (error) {
    console.error("[posty/scheduled-posts] insert failed:", error.message);
    return null;
  }

  return rowToScheduledPost(data as ScheduledPostRow);
}

export function getScheduledDaysForMonth(
  posts: ScheduledPost[],
  year: number,
  month: number,
): number[] {
  const days = new Set<number>();

  for (const post of posts) {
    const date = new Date(post.scheduledAt);
    if (date.getFullYear() === year && date.getMonth() === month) {
      days.add(date.getDate());
    }
  }

  return [...days].sort((a, b) => a - b);
}

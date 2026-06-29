import { PLATFORM_COLORS } from "@/components/dashboard/platform-icon";
import { getDatePartsInTimeZone, getScheduleDisplayTimeZone } from "./schedule-display";
import type { ScheduledPost, SocialPlatform } from "./dashboard-data";
import { PLATFORMS } from "./dashboard-data";
import type { PublishMediaType } from "./publish";
import { createAdminClient, isSupabaseAdminConfigured } from "./supabase-admin";
import { getSupabaseProjectRef } from "./save-connected-account";
import type { createClient } from "./supabase-server";

export type ScheduledPostRow = {
  id: string;
  user_id: string;
  platform: string;
  title: string;
  caption: string | null;
  scheduled_at: string;
  media_url: string | null;
  media_type: string | null;
  status: string;
  published_at: string | null;
  last_publish_error: string | null;
  publish_attempts: number;
  created_at: string;
};

export type CreateScheduledPostInput = {
  platform: SocialPlatform;
  title: string;
  caption?: string | null;
  scheduledAt: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | null;
};

export async function checkScheduledPostsTable(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{
  ready: boolean;
  serviceRoleConfigured: boolean;
  projectRef: string | null;
  errorCode?: string;
  errorMessage?: string;
}> {
  const projectRef = getSupabaseProjectRef();
  const serviceRoleConfigured = isSupabaseAdminConfigured();

  const { error: userError } = await supabase
    .from("scheduled_posts")
    .select("id")
    .limit(0);

  if (!userError) {
    return { ready: true, serviceRoleConfigured, projectRef };
  }

  if (isMissingTableError(userError)) {
    return {
      ready: false,
      serviceRoleConfigured,
      projectRef,
      errorCode: userError.code,
      errorMessage: userError.message,
    };
  }

  if (serviceRoleConfigured) {
    const admin = createAdminClient();
    const { error: adminError } = await admin
      .from("scheduled_posts")
      .select("id")
      .limit(1);

    if (!adminError) {
      return { ready: true, serviceRoleConfigured: true, projectRef };
    }

    if (isMissingTableError(adminError)) {
      return {
        ready: false,
        serviceRoleConfigured: true,
        projectRef,
        errorCode: adminError.code,
        errorMessage: adminError.message,
      };
    }
  }

  // Table likely exists; let insert surface any auth/RLS issue.
  return {
    ready: true,
    serviceRoleConfigured,
    projectRef,
    errorCode: userError.code,
    errorMessage: userError.message,
  };
}

function isMissingTableError(error: { code?: string; message?: string }): boolean {
  const code = error.code ?? "";
  const message = error.message?.toLowerCase() ?? "";

  return (
    code === "42P01" ||
    code === "PGRST205" ||
    code === "PGRST204" ||
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    message.includes("schema cache")
  );
}

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
      media_type: input.mediaType ?? null,
      status: "scheduled",
    })
    .select("*")
    .single();

  if (error) {
    console.error(
      "[posty/scheduled-posts] insert failed:",
      error.code,
      error.message,
    );
    if (isMissingTableError(error)) {
      throw new Error("missing_table");
    }
    throw new Error(`insert_failed:${error.code ?? "unknown"}`);
  }

  return rowToScheduledPost(data as ScheduledPostRow);
}

export function getScheduledDaysForMonth(
  posts: ScheduledPost[],
  year: number,
  month: number,
  locale = "en",
): number[] {
  const days = new Set<number>();
  const timeZone = getScheduleDisplayTimeZone(locale) ?? "UTC";

  for (const post of posts) {
    const parts = getDatePartsInTimeZone(post.scheduledAt, timeZone);
    if (parts.year === year && parts.month - 1 === month) {
      days.add(parts.day);
    }
  }

  return [...days].sort((a, b) => a - b);
}

export function inferScheduledMediaType(
  mediaUrl: string | null | undefined,
): PublishMediaType | null {
  if (!mediaUrl) {
    return null;
  }

  if (/\.(mp4|mov|webm)(\?|$)/i.test(mediaUrl)) {
    return "video";
  }

  if (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(mediaUrl)) {
    return "image";
  }

  return "image";
}

export async function claimScheduledPostForPublish(): Promise<ScheduledPostRow | null> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: duePosts, error: fetchError } = await admin
    .from("scheduled_posts")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(1);

  if (fetchError) {
    console.error("[posty/cron] fetch due posts failed:", fetchError.message);
    return null;
  }

  const candidate = duePosts?.[0] as ScheduledPostRow | undefined;
  if (!candidate) {
    return null;
  }

  const { data: claimed, error: claimError } = await admin
    .from("scheduled_posts")
    .update({ status: "publishing" })
    .eq("id", candidate.id)
    .eq("status", "scheduled")
    .select("*")
    .maybeSingle();

  if (claimError) {
    console.error("[posty/cron] claim post failed:", claimError.message);
    return null;
  }

  return (claimed as ScheduledPostRow | null) ?? null;
}

export async function markScheduledPostPublished(postId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("scheduled_posts")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      last_publish_error: null,
    })
    .eq("id", postId);

  if (error) {
    console.error("[posty/cron] mark published failed:", error.message);
  }
}

export async function markScheduledPostFailed(
  postId: string,
  errorMessage: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("scheduled_posts")
    .update({
      status: "failed",
      last_publish_error: errorMessage.slice(0, 2000),
    })
    .eq("id", postId);

  if (error) {
    console.error("[posty/cron] mark failed failed:", error.message);
  }
}

export async function releaseScheduledPostAfterFailure(
  postId: string,
  errorMessage: string,
  publishAttempts: number,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("scheduled_posts")
    .update({
      status: "scheduled",
      publish_attempts: publishAttempts,
      last_publish_error: errorMessage.slice(0, 2000),
    })
    .eq("id", postId);

  if (error) {
    console.error("[posty/cron] release post failed:", error.message);
  }
}

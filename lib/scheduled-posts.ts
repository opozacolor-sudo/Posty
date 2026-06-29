import { PLATFORM_COLORS } from "@/components/dashboard/platform-icon";
import type { ScheduledPost, SocialPlatform } from "./dashboard-data";
import { PLATFORMS } from "./dashboard-data";
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

export async function checkScheduledPostsTable(): Promise<{
  ready: boolean;
  serviceRoleConfigured: boolean;
  projectRef: string | null;
  errorCode?: string;
  errorMessage?: string;
}> {
  const projectRef = getSupabaseProjectRef();
  const serviceRoleConfigured = isSupabaseAdminConfigured();

  if (!serviceRoleConfigured) {
    return {
      ready: false,
      serviceRoleConfigured: false,
      projectRef,
      errorCode: "missing_service_role",
      errorMessage: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server.",
    };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("scheduled_posts").select("id").limit(1);

  if (!error) {
    return { ready: true, serviceRoleConfigured: true, projectRef };
  }

  return {
    ready: false,
    serviceRoleConfigured: true,
    projectRef,
    errorCode: error.code,
    errorMessage: error.message,
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
      status: "scheduled",
    })
    .select("*")
    .single();

  if (error) {
    console.error("[posty/scheduled-posts] insert failed:", error.message);
    if (isMissingTableError(error)) {
      throw new Error("missing_table");
    }
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

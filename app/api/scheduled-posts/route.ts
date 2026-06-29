import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase-server";
import {
  createScheduledPost,
  fetchUpcomingScheduledPosts,
  type CreateScheduledPostInput,
} from "@/lib/scheduled-posts";
import { PLATFORMS } from "@/lib/dashboard-data";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const posts = await fetchUpcomingScheduledPosts(supabase, user.id);
  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  const t = await getTranslations("dashboard");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: t("chatSessionExpired") }, { status: 401 });
  }

  let body: Partial<CreateScheduledPostInput>;

  try {
    body = (await request.json()) as Partial<CreateScheduledPostInput>;
  } catch {
    return NextResponse.json({ error: t("scheduleFailed") }, { status: 400 });
  }

  if (
    !body.platform ||
    !PLATFORMS.includes(body.platform) ||
    !body.title?.trim() ||
    !body.scheduledAt
  ) {
    return NextResponse.json({ error: t("scheduleMissingFields") }, { status: 400 });
  }

  try {
    const post = await createScheduledPost(supabase, user.id, {
      platform: body.platform,
      title: body.title.trim(),
      caption: body.caption ?? null,
      scheduledAt: body.scheduledAt,
      mediaUrl: body.mediaUrl ?? null,
    });

    if (!post) {
      return NextResponse.json({ error: t("scheduleFailed") }, { status: 500 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    const code = error instanceof Error ? error.message : "unknown";

    if (code === "scheduled_at_in_past") {
      return NextResponse.json({ error: t("scheduleInPast") }, { status: 400 });
    }

    return NextResponse.json({ error: t("scheduleFailed") }, { status: 500 });
  }
}

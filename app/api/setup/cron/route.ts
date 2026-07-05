import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/app-url";
import { checkScheduledPostsTable } from "@/lib/scheduled-posts";
import { isSupabaseAdminConfigured } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tableStatus = await checkScheduledPostsTable(supabase);
  const appBaseUrl = getAppBaseUrl(request);
  const cronUrl = `${appBaseUrl.replace(/\/$/, "")}/api/cron/publish-scheduled`;

  return NextResponse.json({
    ...tableStatus,
    cronUrl,
    cronSecretConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    serviceRoleConfigured: isSupabaseAdminConfigured(),
    setupSqlFiles: [
      "supabase/migrations/20250629130000_scheduled_posts.sql",
      "supabase/migrations/20250629160000_scheduled_posts_publish_worker.sql",
      "supabase/migrations/20250629170000_scheduled_posts_media_storage_paths.sql",
    ],
    externalCron: {
      provider: "cron-job.org",
      schedule: "every 5 minutes",
      method: "GET or POST",
      url: cronUrl,
      headers: {
        Authorization: "Bearer <CRON_SECRET>",
      },
      note:
        "Vercel Hobby allows at most one native cron per day. Use an external cron every 5 minutes so scheduled posts publish on time.",
    },
  });
}

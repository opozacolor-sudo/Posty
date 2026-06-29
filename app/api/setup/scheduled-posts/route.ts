import { NextResponse } from "next/server";
import { checkScheduledPostsTable } from "@/lib/scheduled-posts";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const status = await checkScheduledPostsTable();

  return NextResponse.json({
    ...status,
    setupSqlFile: "supabase/migrations/20250629130000_scheduled_posts.sql",
  });
}

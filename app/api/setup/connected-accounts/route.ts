import { NextResponse } from "next/server";
import { checkConnectedAccountsTable } from "@/lib/save-connected-account";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const status = await checkConnectedAccountsTable();

  return NextResponse.json({
    ...status,
    setupSqlFile: "supabase/setup-connected-accounts.sql",
  });
}

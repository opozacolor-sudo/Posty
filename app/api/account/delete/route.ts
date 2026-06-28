import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";

export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json(
        { error: "Account deletion is not configured on the server." },
        { status: 503 },
      );
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Could not delete account." },
      { status: 500 },
    );
  }
}

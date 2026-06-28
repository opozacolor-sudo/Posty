import { NextResponse, type NextRequest } from "next/server";
import { routing, type Locale } from "@/i18n/routing";
import {
  disconnectConnectedAccount,
  isDisconnectablePlatform,
} from "@/lib/disconnect-connected-account";
import { createClient } from "@/lib/supabase-server";

function resolveLocale(value: string | null | undefined): Locale {
  if (value && routing.locales.includes(value as Locale)) {
    return value as Locale;
  }

  return routing.defaultLocale;
}

function redirectToAccounts(
  request: NextRequest,
  locale: Locale,
  params?: Record<string, string>,
) {
  const url = new URL(`/${locale}/accounts`, request.url);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  return NextResponse.redirect(url);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const platform = String(formData.get("platform") ?? "");
  const locale = resolveLocale(String(formData.get("locale") ?? ""));

  if (!isDisconnectablePlatform(platform)) {
    return redirectToAccounts(request, locale, { error: "disconnect_invalid_platform" });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  const result = await disconnectConnectedAccount(user.id, platform);

  if (!result.ok) {
    return redirectToAccounts(request, locale, { error: "disconnect_failed" });
  }

  return redirectToAccounts(request, locale, { disconnected: platform });
}

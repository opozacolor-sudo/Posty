import { NextResponse, type NextRequest } from "next/server";
import {
  redirectToAccounts,
  resolveOAuthLocale,
} from "@/lib/instagram-oauth-session";

type Props = {
  params: Promise<{ platform: string }>;
};

export async function GET(request: NextRequest, { params }: Props) {
  const { platform } = await params;
  const locale = resolveOAuthLocale(request.nextUrl.searchParams.get("locale"));

  return redirectToAccounts(request, locale, {
    error: `${platform}_not_available`,
  });
}

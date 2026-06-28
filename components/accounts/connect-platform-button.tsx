"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  INSTAGRAM_OAUTH_PATH,
  isOAuthPlatform,
} from "@/lib/connected-accounts";
import type { SocialPlatform } from "@/lib/dashboard-data";

type ConnectPlatformButtonProps = {
  platform: SocialPlatform;
  connected: boolean;
};

export function ConnectPlatformButton({
  platform,
  connected,
}: ConnectPlatformButtonProps) {
  const t = useTranslations("dashboard");
  const locale = useLocale();

  if (isOAuthPlatform(platform) && !connected) {
    return (
      <a
        href={`${INSTAGRAM_OAUTH_PATH}?locale=${locale}`}
        className="btn-primary rounded-full px-4 py-2 text-sm font-semibold"
      >
        {t("connect")}
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled={!connected}
      className={`rounded-full px-4 py-2 text-sm font-semibold ${
        connected
          ? "border border-border bg-white text-foreground"
          : "btn-primary py-2 opacity-60"
      }`}
    >
      {connected ? t("disconnect") : t("connect")}
    </button>
  );
}

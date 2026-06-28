"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

const OAUTH_MESSAGE_KEYS = {
  connected: "instagramConnected",
  instagram_denied: "instagramDenied",
  instagram_invalid_state: "instagramInvalidState",
  instagram_no_business_account: "instagramNoBusinessAccount",
  instagram_not_configured: "instagramNotConfigured",
  instagram_save_failed: "instagramSaveFailed",
  instagram_token_failed: "instagramTokenFailed",
} as const;

type OAuthMessageKey = keyof typeof OAUTH_MESSAGE_KEYS;

export function OAuthStatusBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("dashboard");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    let nextMessage: { type: "success" | "error"; text: string } | null = null;

    if (connected === "instagram") {
      nextMessage = { type: "success", text: t(OAUTH_MESSAGE_KEYS.connected) };
    } else if (error && error in OAUTH_MESSAGE_KEYS) {
      nextMessage = {
        type: "error",
        text: t(OAUTH_MESSAGE_KEYS[error as OAuthMessageKey]),
      };
    }

    if (nextMessage) {
      setMessage(nextMessage);
      router.replace("/accounts");
    }
  }, [router, searchParams, t]);

  if (!message) return null;

  return (
    <div
      className={`mb-2 rounded-xl px-3 py-2 text-xs font-medium ${
        message.type === "success"
          ? "bg-green/10 text-green"
          : "bg-coral/10 text-coral"
      }`}
    >
      {message.text}
    </div>
  );
}

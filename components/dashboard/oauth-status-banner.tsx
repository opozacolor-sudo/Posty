"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { PLATFORMS } from "@/lib/dashboard-data";

const SUCCESS_KEYS: Record<string, string> = {
  instagram: "instagramConnected",
  youtube: "youtubeConnected",
  facebook: "facebookConnected",
  threads: "threadsConnected",
  tiktok: "tiktokConnected",
  linkedin: "linkedinConnected",
  pinterest: "pinterestConnected",
};

const ERROR_KEYS: Record<string, string> = {
  disconnect_failed: "disconnectFailed",
  disconnect_invalid_platform: "disconnectInvalidPlatform",
  facebook_denied: "facebookDenied",
  facebook_invalid_state: "facebookInvalidState",
  facebook_no_page: "facebookNoPage",
  facebook_not_configured: "facebookNotConfigured",
  facebook_save_failed: "facebookSaveFailed",
  facebook_save_permission: "facebookSavePermission",
  facebook_save_unknown: "facebookSaveUnknown",
  facebook_service_role_missing: "facebookServiceRoleMissing",
  facebook_token_failed: "facebookTokenFailed",
  instagram_denied: "instagramDenied",
  instagram_invalid_state: "instagramInvalidState",
  instagram_no_business_account: "instagramNoBusinessAccount",
  instagram_not_configured: "instagramNotConfigured",
  instagram_save_failed: "instagramSaveFailed",
  instagram_save_permission: "instagramSavePermission",
  instagram_save_unknown: "instagramSaveUnknown",
  instagram_service_role_missing: "instagramServiceRoleMissing",
  instagram_token_failed: "instagramTokenFailed",
  threads_denied: "threadsDenied",
  threads_invalid_state: "threadsInvalidState",
  threads_not_configured: "threadsNotConfigured",
  threads_save_failed: "threadsSaveFailed",
  threads_save_permission: "threadsSavePermission",
  threads_save_unknown: "threadsSaveUnknown",
  threads_service_role_missing: "threadsServiceRoleMissing",
  threads_token_failed: "threadsTokenFailed",
  tiktok_denied: "tiktokDenied",
  tiktok_invalid_state: "tiktokInvalidState",
  tiktok_not_configured: "tiktokNotConfigured",
  tiktok_save_failed: "tiktokSaveFailed",
  tiktok_save_permission: "tiktokSavePermission",
  tiktok_save_unknown: "tiktokSaveUnknown",
  tiktok_service_role_missing: "tiktokServiceRoleMissing",
  tiktok_token_failed: "tiktokTokenFailed",
  linkedin_denied: "linkedinDenied",
  linkedin_invalid_state: "linkedinInvalidState",
  linkedin_not_configured: "linkedinNotConfigured",
  linkedin_save_failed: "linkedinSaveFailed",
  linkedin_save_permission: "linkedinSavePermission",
  linkedin_save_unknown: "linkedinSaveUnknown",
  linkedin_service_role_missing: "linkedinServiceRoleMissing",
  linkedin_token_failed: "linkedinTokenFailed",
  pinterest_denied: "pinterestDenied",
  pinterest_invalid_state: "pinterestInvalidState",
  pinterest_not_configured: "pinterestNotConfigured",
  pinterest_save_failed: "pinterestSaveFailed",
  pinterest_save_permission: "pinterestSavePermission",
  pinterest_save_unknown: "pinterestSaveUnknown",
  pinterest_service_role_missing: "pinterestServiceRoleMissing",
  pinterest_token_failed: "pinterestTokenFailed",
  youtube_denied: "youtubeDenied",
  youtube_invalid_state: "youtubeInvalidState",
  youtube_no_channel: "youtubeNoChannel",
  youtube_not_configured: "youtubeNotConfigured",
  youtube_save_failed: "youtubeSaveFailed",
  youtube_save_permission: "youtubeSavePermission",
  youtube_save_unknown: "youtubeSaveUnknown",
  youtube_service_role_missing: "youtubeServiceRoleMissing",
  youtube_token_failed: "youtubeTokenFailed",
};

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
    const disconnected = searchParams.get("disconnected");
    const error = searchParams.get("error");

    let nextMessage: { type: "success" | "error"; text: string } | null = null;

    if (connected && connected in SUCCESS_KEYS) {
      nextMessage = {
        type: "success",
        text: t(SUCCESS_KEYS[connected]),
      };
    } else if (
      disconnected &&
      (PLATFORMS as readonly string[]).includes(disconnected)
    ) {
      nextMessage = {
        type: "success",
        text: t("disconnectedSuccess", {
          platform: t(`platforms.${disconnected}`),
        }),
      };
    } else if (error && error in ERROR_KEYS) {
      nextMessage = {
        type: "error",
        text: t(ERROR_KEYS[error]),
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

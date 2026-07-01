import type { SocialPlatform } from "./dashboard-data";
import { isSupabaseAdminConfigured } from "./supabase-admin";
import { expandPublishTargets } from "./publish-all-targets";
import type { PublishInput, PublishTarget } from "./publish";
import {
  buildChunkedPublishMediaProxyUrl,
  fetchPublishMediaBytes,
  resolvePublishMediaUrl,
} from "./publish-media-url";

export type PreflightCheck = {
  id: string;
  ok: boolean;
  blocking: boolean;
  message: string;
};

export type PublishPreflightResult = {
  ready: boolean;
  checks: PreflightCheck[];
  targets: PublishTarget[];
};

function targetLabel(target: PublishTarget): string {
  return target.format ? `${target.platform} (${target.format})` : target.platform;
}

export async function runPublishPreflight(options: {
  input: PublishInput;
  connectedPlatforms: SocialPlatform[];
  publishText: string;
  appBaseUrl?: string;
  locale?: string;
}): Promise<PublishPreflightResult> {
  const { input, connectedPlatforms, publishText, appBaseUrl, locale = "en" } =
    options;
  const ro = locale === "ro";
  const checks: PreflightCheck[] = [];

  if (!input.caption?.trim()) {
    checks.push({
      id: "caption",
      ok: false,
      blocking: true,
      message: ro ? "Lipsește textul postării (caption)." : "Post caption is missing.",
    });
  } else {
    checks.push({
      id: "caption",
      ok: true,
      blocking: false,
      message: ro ? "Caption găsit." : "Caption found.",
    });
  }

  if (!input.mediaUrl && !input.mediaStoragePaths?.length) {
    checks.push({
      id: "media",
      ok: false,
      blocking: true,
      message: ro
        ? "Lipsește video/poză — atașează cu 📎."
        : "Media missing — attach with 📎.",
    });
  } else {
    checks.push({
      id: "media",
      ok: true,
      blocking: false,
      message: ro ? "Media găsită." : "Media found.",
    });
  }

  if (!isSupabaseAdminConfigured()) {
    checks.push({
      id: "service_role",
      ok: false,
      blocking: true,
      message: ro
        ? "SUPABASE_SERVICE_ROLE_KEY lipsește pe Vercel — token-urile conturilor nu se încarcă."
        : "SUPABASE_SERVICE_ROLE_KEY missing on Vercel — account tokens won't load.",
    });
  } else {
    checks.push({
      id: "service_role",
      ok: true,
      blocking: false,
      message: ro ? "Token-uri conturi: OK." : "Account tokens: OK.",
    });
  }

  const targets = expandPublishTargets(input, connectedPlatforms, publishText);

  if (targets.length === 0) {
    checks.push({
      id: "targets",
      ok: false,
      blocking: true,
      message: ro
        ? "Nicio platformă conectată pentru publicare."
        : "No connected platforms to publish to.",
    });
  } else {
    checks.push({
      id: "targets",
      ok: true,
      blocking: false,
      message: ro
        ? `Ținte: ${targets.map(targetLabel).join(", ")} (${targets.length}).`
        : `Targets: ${targets.map(targetLabel).join(", ")} (${targets.length}).`,
    });
  }

  for (const target of targets) {
    if (!connectedPlatforms.includes(target.platform)) {
      checks.push({
        id: `account_${target.platform}_${target.format ?? "feed"}`,
        ok: false,
        blocking: true,
        message: ro
          ? `${targetLabel(target)} — cont neconectat.`
          : `${targetLabel(target)} — account not connected.`,
      });
    }
  }

  if (input.mediaType === "video" && input.mediaUrl) {
    const needsUrl = targets.some(
      (target) =>
        target.platform === "facebook" ||
        target.platform === "instagram" ||
        target.platform === "threads",
    );

    if (needsUrl) {
      let videoUrl: string | null = null;

      if (input.mediaStoragePaths?.length) {
        videoUrl =
          buildChunkedPublishMediaProxyUrl(input.mediaStoragePaths, appBaseUrl) ??
          (await resolvePublishMediaUrl(input.mediaUrl, appBaseUrl));
      } else {
        videoUrl = await resolvePublishMediaUrl(input.mediaUrl, appBaseUrl);
      }

      if (!videoUrl || videoUrl.startsWith("blob:")) {
        checks.push({
          id: "video_url",
          ok: false,
          blocking: true,
          message: ro
            ? "URL video indisponibil pentru Meta/Threads — reatașează videoclipul."
            : "Video URL unavailable for Meta/Threads — re-attach the video.",
        });
      } else {
        checks.push({
          id: "video_url",
          ok: true,
          blocking: false,
          message: ro ? "URL video pentru Meta/Threads: OK." : "Video URL for Meta/Threads: OK.",
        });
      }
    }

    const needsBytes = targets.some(
      (target) =>
        target.platform === "tiktok" ||
        target.platform === "youtube" ||
        target.platform === "linkedin",
    );

    if (needsBytes) {
      const downloaded = await fetchPublishMediaBytes(
        input.mediaUrl,
        input.mediaStoragePaths,
      );

      if (!downloaded) {
        checks.push({
          id: "video_bytes",
          ok: false,
          blocking: true,
          message: ro
            ? "Nu pot descărca videoclipul pentru TikTok/YouTube/LinkedIn."
            : "Could not download video for TikTok/YouTube/LinkedIn.",
        });
      } else {
        const sizeMb = (downloaded.bytes.length / (1024 * 1024)).toFixed(1);
        checks.push({
          id: "video_bytes",
          ok: true,
          blocking: false,
          message: ro
            ? `Video descărcat pentru upload direct (${sizeMb} MB).`
            : `Video ready for direct upload (${sizeMb} MB).`,
        });
      }
    }
  }

  const ready = checks.every((check) => check.ok || !check.blocking);

  return { ready, checks, targets };
}

export function formatPreflightSummary(
  result: PublishPreflightResult,
  locale: string,
): string {
  const ro = locale === "ro";
  const failed = result.checks.filter((check) => !check.ok);

  if (result.ready) {
    const lines = result.checks.map((check) =>
      ro ? `✓ ${check.message}` : `✓ ${check.message}`,
    );
    return ro
      ? ["Verificări înainte de publicare — totul OK:", ...lines].join("\n")
      : ["Pre-publish checks — all OK:", ...lines].join("\n");
  }

  return ro
    ? [
        "Publicarea oprită — rezolvă aceste probleme:",
        ...failed.map((check) => `- ${check.message}`),
      ].join("\n")
    : [
        "Publishing blocked — fix these first:",
        ...failed.map((check) => `- ${check.message}`),
      ].join("\n");
}

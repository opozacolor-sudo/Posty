import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { createClaudeReply } from "@/lib/anthropic-client";
import { isAnthropicConfigured } from "@/lib/anthropic-env";
import {
  buildClaudeBrandContext,
  parseBrandProfile,
} from "@/lib/brand-profile";
import {
  buildChatSystemPrompt,
  trimChatHistory,
} from "@/lib/chat-context";
import { fetchUserConnectedAccounts } from "@/lib/connected-accounts";
import {
  formatHiggsfieldError,
  generateHiggsfieldImage,
  resolveImageGenerationIntent,
  userWantsVideoGeneration,
} from "@/lib/higgsfield-generate";
import { isHiggsfieldGenerationAvailable } from "@/lib/higgsfield-env";
import {
  extractPublishFromConversation,
  shouldAttemptPublish,
} from "@/lib/publish-intent";
import {
  extractCaption,
  findLatestMediaUrl,
} from "@/lib/schedule-intent";
import {
  formatPublishResultsSummary,
  publishToConnectedPlatforms,
  type PublishPlatformResult,
} from "@/lib/publish";
import {
  formatPublishMissingDetailsReply,
  formatPublishUserReply,
} from "@/lib/publish-reply";
import { getAppBaseUrl } from "@/lib/app-url";
import { resolvePublishMediaUrl } from "@/lib/publish-media-url";
import {
  extractScheduleFromConversation,
  formatScheduleConfirmation,
  shouldAttemptScheduleExtraction,
  userConfirmsScheduling,
  userMentionsScheduling,
} from "@/lib/schedule-intent";
import { checkScheduledPostsTable, createScheduledPost } from "@/lib/scheduled-posts";
import { createClient } from "@/lib/supabase-server";
import type { ChatAttachment } from "@/lib/chat-upload";

export const runtime = "nodejs";
export const maxDuration = 120;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
};

type ChatRequestBody = {
  messages?: ChatMessage[];
  locale?: string;
};

function resolveLocale(value: string | undefined): Locale {
  if (value && routing.locales.includes(value as Locale)) {
    return value as Locale;
  }

  return routing.defaultLocale;
}

function getMockReply(userMessage: string, t: Awaited<ReturnType<typeof getTranslations>>): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes("instagram") || lower.includes("post")) {
    return t("chatReplyPost");
  }
  if (lower.includes("schedule") || lower.includes("program")) {
    return t("chatReplySchedule");
  }
  if (lower.includes("stat") || lower.includes("analiz")) {
    return t("chatReplyStats");
  }

  return t("chatReplyDefault");
}

function normalizeHistory(messages: ChatMessage[]): ChatMessage[] {
  return trimChatHistory(
    messages.filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        message.content.trim(),
    ),
  );
}

export async function POST(request: Request) {
  let t: Awaited<ReturnType<typeof getTranslations>>;

  try {
    t = await getTranslations("dashboard");
  } catch {
    t = ((key: string) => key) as Awaited<ReturnType<typeof getTranslations>>;
  }

  try {
    const body = (await request.json()) as ChatRequestBody;
    const locale = resolveLocale(body.locale);
    const history = normalizeHistory(body.messages ?? []);

    if (history.length === 0) {
      console.warn("[posty/chat] Rejected request with empty message history");
      return NextResponse.json(
        { error: t("chatError"), source: "error" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: t("chatSessionExpired"), source: "error" },
        { status: 401 },
      );
    }

    const lastUserMessage =
      [...history].reverse().find((message) => message.role === "user")
        ?.content ?? "";

    if (!isAnthropicConfigured()) {
      return NextResponse.json({
        reply: getMockReply(lastUserMessage, t),
        source: "mock",
        configured: false,
      });
    }

    const brandProfile = parseBrandProfile(user.user_metadata?.brand_profile);
    const brandContext = buildClaudeBrandContext(brandProfile);
    const connectedAccounts = await fetchUserConnectedAccounts(supabase, user.id);
    const userName =
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : user.email?.split("@")[0] ?? null;

    let mediaContext: string | undefined;
    let generatedImageUrl: string | undefined;
    let scheduledPost:
      | Awaited<ReturnType<typeof createScheduledPost>>
      | undefined;
    let scheduleSaveFailed = false;
    let publishResults: PublishPlatformResult[] | undefined;
    let publishFailed = false;
    let publishSummary: string | undefined;
    let publishAttempted = false;

    if (shouldAttemptPublish(lastUserMessage, history)) {
      publishAttempted = true;
      try {
        const publishInput = extractPublishFromConversation({
          messages: history,
          connectedAccounts,
        });

        if (publishInput) {
          const appBaseUrl = getAppBaseUrl(request);
          const publishMediaUrl = await resolvePublishMediaUrl(
            publishInput.mediaUrl,
            appBaseUrl,
          );

          publishResults = await publishToConnectedPlatforms(user.id, publishInput, {
            sessionClient: supabase,
            mediaUrl: publishMediaUrl,
          });
          publishSummary = formatPublishResultsSummary(publishResults, locale);
          const anySuccess = publishResults.some((result) => result.success);

          if (anySuccess) {
            mediaContext = [
              "IMPORTANT: Publishing COMPLETED. Per-platform results:",
              publishSummary,
              "Tell the user which platforms succeeded, failed, or were skipped.",
              "Do NOT claim success for platforms that failed or were skipped.",
              "Do NOT say you are waiting for confirmation — publishing already finished.",
            ].join("\n");
          } else if (publishResults.length === 0) {
            publishFailed = true;
            publishSummary =
              locale === "ro"
                ? "Publicare eșuată: nu am putut încărca token-urile conturilor (verifică SUPABASE_SERVICE_ROLE_KEY pe Vercel)."
                : "Publishing failed: could not load connected account tokens (check SUPABASE_SERVICE_ROLE_KEY on Vercel).";
            mediaContext = [
              "IMPORTANT: Publishing FAILED before any platform was attempted.",
              publishSummary,
              "Do NOT claim anything was published.",
            ].join("\n");
          } else {
            publishFailed = true;
            mediaContext = [
              "IMPORTANT: Publishing FAILED on all attempted platforms.",
              publishSummary,
              "Explain the errors and suggest fixes (e.g. attach a photo for Instagram).",
              "Do NOT claim any platform published successfully.",
              "Do NOT say you are waiting for confirmation — publishing already finished.",
            ].join("\n");
          }
        } else {
          publishFailed = true;
          const hasCaption = Boolean(extractCaption(history));
          const hasMedia = Boolean(findLatestMediaUrl(history));
          mediaContext = [
            "IMPORTANT: Could not publish — missing details from the conversation.",
            hasCaption
              ? "Caption was found."
              : "Caption is missing — include text or ask Claude to draft one.",
            hasMedia
              ? "Image URL was found."
              : "Image is missing — attach the photo with 📎 in chat (required for Instagram).",
            "Do NOT claim anything was published.",
          ].join("\n");
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        console.error("[posty/chat] Publish failed:", detail);
        publishFailed = true;
        mediaContext = [
          "IMPORTANT: Publishing FAILED due to a server error.",
          `Detail: ${detail}`,
          "Do NOT claim anything was published.",
        ].join("\n");
      }
    } else if (shouldAttemptScheduleExtraction(lastUserMessage, history)) {
      try {
        const tableStatus = await checkScheduledPostsTable(supabase);

        if (!tableStatus.ready) {
          scheduleSaveFailed = true;
          mediaContext = [
            "IMPORTANT: Scheduling FAILED — the scheduled_posts table is not set up in Supabase yet.",
            "Tell the user to open Supabase SQL Editor and run supabase/migrations/20250629130000_scheduled_posts.sql.",
            "Do NOT claim the post was saved.",
          ].join("\n");
        } else {
          const scheduleInput = await extractScheduleFromConversation({
            messages: history,
            connectedAccounts,
            locale,
          });

          if (scheduleInput) {
            const saved = await createScheduledPost(
              supabase,
              user.id,
              scheduleInput,
            );

            if (saved) {
              scheduledPost = saved;
              mediaContext = [
                "IMPORTANT: The post was SUCCESSFULLY saved to the Posty calendar.",
                formatScheduleConfirmation(scheduleInput, locale),
                "Confirm this to the user briefly. Do NOT say scheduling is unavailable.",
                `Platform: ${scheduleInput.platform}`,
                `Scheduled: ${scheduleInput.scheduledAt}`,
                `Caption preview: ${scheduleInput.title}`,
              ].join("\n");
            } else {
              scheduleSaveFailed = true;
              mediaContext = [
                "IMPORTANT: Scheduling FAILED when saving to the database.",
                "Apologize briefly and ask the user to try again in a moment.",
                "Do NOT claim the post was saved.",
              ].join("\n");
            }
          } else if (
            userConfirmsScheduling(lastUserMessage) ||
            userMentionsScheduling(lastUserMessage)
          ) {
            scheduleSaveFailed = true;
            mediaContext = [
              "IMPORTANT: Could not extract schedule details from the conversation.",
              "Ask the user to send platform, caption, and date/time in one message.",
              "Do NOT claim the post was saved.",
            ].join("\n");
          }
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        console.error("[posty/chat] Schedule failed:", detail);
        scheduleSaveFailed = true;

        if (detail === "missing_table") {
          mediaContext = [
            "IMPORTANT: Scheduling FAILED — run the scheduled_posts migration in Supabase SQL Editor first.",
            "Do NOT claim the post was saved.",
          ].join("\n");
        } else if (detail === "scheduled_at_in_past") {
          mediaContext = [
            "IMPORTANT: Scheduling FAILED — the chosen date/time is in the past.",
            "Ask the user for a future date and time.",
            "Do NOT claim the post was saved.",
          ].join("\n");
        } else if (detail.startsWith("insert_failed:")) {
          mediaContext = [
            "IMPORTANT: Scheduling FAILED when writing to Supabase.",
            `Server detail: ${detail}`,
            "Do NOT claim the post was saved.",
          ].join("\n");
        } else {
          mediaContext = [
            "IMPORTANT: Scheduling FAILED due to a server error.",
            "Do NOT claim the post was saved.",
          ].join("\n");
        }
      }
    }

    const imageIntent = resolveImageGenerationIntent(history, lastUserMessage);

    if (!scheduledPost && !publishResults && isHiggsfieldGenerationAvailable() && imageIntent.shouldGenerate) {
      try {
        const image = await generateHiggsfieldImage({
          prompt: imageIntent.prompt,
          aspectRatio: imageIntent.aspectRatio,
        });
        generatedImageUrl = image.url;
        mediaContext = [
          "IMPORTANT: Image generation is already COMPLETE.",
          "Do NOT say you are processing, generating, waiting, or contacting Higgsfield.",
          "The image preview appears automatically in the Posty chat UI under your reply.",
          `Image URL: ${image.url}`,
          "Briefly describe what was generated, then give 1-2 caption options and hashtags.",
        ].join("\n");
      } catch (error) {
        const detail = formatHiggsfieldError(error);
        console.error("[posty/chat] Higgsfield image failed:", detail);
        mediaContext = `Image generation was requested but failed (${detail}). Apologize briefly and offer to retry with a clearer prompt.`;
      }
    } else if (!scheduledPost && !publishResults && userWantsVideoGeneration(lastUserMessage)) {
      mediaContext =
        "The user asked for video generation. Video via Higgsfield is not wired in Posty yet. Explain that image generation works now and video is next.";
    }

    if (publishAttempted) {
      const anySuccess = publishResults?.some((result) => result.success) ?? false;
      const reply = publishSummary
        ? formatPublishUserReply(publishSummary, locale, anySuccess)
        : formatPublishMissingDetailsReply(locale);

      return NextResponse.json({
        reply,
        source: "claude",
        configured: true,
        model: null,
        generatedImageUrl,
        scheduledPost,
        scheduleSaveFailed,
        publishResults,
        publishFailed,
        publishSummary,
        imageGenerationFailed: false,
      });
    }

    const system = buildChatSystemPrompt({
      locale,
      userName,
      brandContext,
      connectedAccounts,
      higgsfieldConfigured: isHiggsfieldGenerationAvailable(),
      mediaContext,
    });

    const { text: claudeReply, model } = await createClaudeReply({
      system,
      messages: history,
    });

    let reply = claudeReply;
    if (publishSummary) {
      reply = `${reply.trim()}\n\n---\n${publishSummary}`;
    }

    return NextResponse.json({
      reply,
      source: "claude",
      configured: true,
      model,
      generatedImageUrl,
      scheduledPost,
      scheduleSaveFailed,
      publishResults,
      publishFailed,
      publishSummary,
      imageGenerationFailed:
        imageIntent.shouldGenerate && !generatedImageUrl && Boolean(mediaContext?.includes("failed")),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[posty/chat] Claude request failed:", message);

    return NextResponse.json(
      {
        error: t("chatError"),
        source: "error",
      },
      { status: 500 },
    );
  }
}

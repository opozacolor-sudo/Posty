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
  extractScheduleFromConversation,
  formatScheduleConfirmation,
  shouldAttemptScheduleExtraction,
} from "@/lib/schedule-intent";
import { createScheduledPost } from "@/lib/scheduled-posts";
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

    if (shouldAttemptScheduleExtraction(lastUserMessage, history)) {
      try {
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
            console.error(
              "[posty/chat] Schedule save returned null — is scheduled_posts migration applied?",
            );
          }
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        console.error("[posty/chat] Schedule extraction failed:", detail);
      }
    }

    const imageIntent = resolveImageGenerationIntent(history, lastUserMessage);

    if (!scheduledPost && isHiggsfieldGenerationAvailable() && imageIntent.shouldGenerate) {
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
    } else if (!scheduledPost && userWantsVideoGeneration(lastUserMessage)) {
      mediaContext =
        "The user asked for video generation. Video via Higgsfield is not wired in Posty yet. Explain that image generation works now and video is next.";
    }

    const system = buildChatSystemPrompt({
      locale,
      userName,
      brandContext,
      connectedAccounts,
      higgsfieldConfigured: isHiggsfieldGenerationAvailable(),
      mediaContext,
    });

    const { text: reply, model } = await createClaudeReply({
      system,
      messages: history,
    });

    return NextResponse.json({
      reply,
      source: "claude",
      configured: true,
      model,
      generatedImageUrl,
      scheduledPost,
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

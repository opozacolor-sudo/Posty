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
import { createClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 120;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
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

    const imageIntent = resolveImageGenerationIntent(history, lastUserMessage);

    if (isHiggsfieldGenerationAvailable() && imageIntent.shouldGenerate) {
      try {
        const image = await generateHiggsfieldImage({
          prompt: imageIntent.prompt,
          aspectRatio: imageIntent.aspectRatio,
        });
        generatedImageUrl = image.url;
        mediaContext = [
          "The user asked to generate an image. Posty already generated it via Higgsfield.",
          `Image URL: ${image.url}`,
          "Include this URL in your reply so the user can open or download it.",
          "Also suggest a caption/hashtags for their target platform.",
        ].join("\n");
      } catch (error) {
        const detail = formatHiggsfieldError(error);
        console.error("[posty/chat] Higgsfield image failed:", detail);
        mediaContext = `Image generation was requested but failed (${detail}). Apologize briefly and offer to retry with a clearer prompt.`;
      }
    } else if (userWantsVideoGeneration(lastUserMessage)) {
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

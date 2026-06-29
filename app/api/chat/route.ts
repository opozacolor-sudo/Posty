import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import {
  buildClaudeBrandContext,
  parseBrandProfile,
} from "@/lib/brand-profile";
import {
  buildChatSystemPrompt,
  trimChatHistory,
} from "@/lib/chat-context";
import { fetchUserConnectedAccounts } from "@/lib/connected-accounts";
import { createClient } from "@/lib/supabase-server";

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

function getMockReply(
  userMessage: string,
  t: Awaited<ReturnType<typeof getTranslations>>,
): string {
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

function isAnthropicConfigured(): boolean {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  return Boolean(apiKey && !apiKey.includes("your_anthropic"));
}

export async function POST(request: Request) {
  const t = await getTranslations("dashboard");

  try {
    const body = (await request.json()) as ChatRequestBody;
    const messages = body.messages ?? [];
    const locale = resolveLocale(body.locale);

    if (messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const lastUserMessage =
      [...messages].reverse().find((message) => message.role === "user")
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

    const system = buildChatSystemPrompt({
      locale,
      userName,
      brandContext,
      connectedAccounts,
    });

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!.trim(),
    });

    const history = trimChatHistory(
      messages.filter((message) => message.content.trim()),
    );

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system,
      messages: history.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    });

    const reply =
      response.content[0]?.type === "text"
        ? response.content[0].text.trim()
        : t("chatReplyDefault");

    return NextResponse.json({
      reply,
      source: "claude",
      configured: true,
    });
  } catch (error) {
    console.error("[posty/chat] Claude request failed:", error);

    return NextResponse.json(
      {
        error: t("chatError"),
        source: "error",
      },
      { status: 500 },
    );
  }
}

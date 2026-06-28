import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import {
  buildClaudeBrandContext,
  parseBrandProfile,
} from "@/lib/brand-profile";
import { createClient } from "@/lib/supabase-server";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: ChatMessage[] };
    const messages = body.messages ?? [];

    if (messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const t = await getTranslations("dashboard");
    const lastUserMessage =
      [...messages].reverse().find((message) => message.role === "user")
        ?.content ?? "";

    const brandProfile = parseBrandProfile(user?.user_metadata?.brand_profile);
    const brandContext = buildClaudeBrandContext(brandProfile);

    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

    if (!apiKey || apiKey.includes("your_anthropic")) {
      return NextResponse.json({
        reply: getMockReply(lastUserMessage, t),
        source: "mock",
      });
    }

    const systemParts = [
      "You are Claude, the AI assistant inside Posty — a social media scheduling app.",
      "Help users write, refine, and schedule social media posts.",
      "Keep replies concise, actionable, and aligned with the user's brand profile when provided.",
    ];

    if (brandContext) {
      systemParts.push("", "User brand profile:", brandContext);
    }

    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemParts.join("\n"),
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    });

    const reply =
      response.content[0]?.type === "text"
        ? response.content[0].text
        : t("chatReplyDefault");

    return NextResponse.json({ reply, source: "claude" });
  } catch {
    const t = await getTranslations("dashboard");
    return NextResponse.json(
      { error: t("chatError"), reply: t("chatReplyDefault"), source: "error" },
      { status: 500 },
    );
  }
}

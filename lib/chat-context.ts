import type { ConnectedAccount } from "./dashboard-data";

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  threads: "Threads",
  x: "X (Twitter)",
  pinterest: "Pinterest",
  bluesky: "Bluesky",
};

const LOCALE_LANGUAGE: Record<string, string> = {
  ro: "Romanian",
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ru: "Russian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ar: "Arabic",
  hi: "Hindi",
};

type BuildChatSystemPromptOptions = {
  locale: string;
  userName?: string | null;
  brandContext?: string;
  connectedAccounts: ConnectedAccount[];
  higgsfieldConfigured?: boolean;
  mediaContext?: string;
};

export function buildConnectedAccountsContext(
  accounts: ConnectedAccount[],
): string {
  const connected = accounts.filter((account) => account.connected);
  const disconnected = accounts.filter((account) => !account.connected);

  const connectedLines =
    connected.length > 0
      ? connected
          .map((account) => {
            const label = PLATFORM_LABELS[account.platform] ?? account.platform;
            return account.accountName
              ? `- ${label}: connected as ${account.accountName}`
              : `- ${label}: connected`;
          })
          .join("\n")
      : "- None connected yet";

  const disconnectedLabels = disconnected
    .map((account) => PLATFORM_LABELS[account.platform] ?? account.platform)
    .join(", ");

  const lines = ["Connected accounts:", connectedLines];

  if (disconnected.length > 0) {
    lines.push("", `Not connected yet: ${disconnectedLabels}`);
    lines.push(
      "If the user asks to post somewhere that is not connected, tell them to connect that platform first from Accounts.",
    );
  }

  return lines.join("\n");
}

export function buildChatSystemPrompt({
  locale,
  userName,
  brandContext,
  connectedAccounts,
  higgsfieldConfigured = false,
  mediaContext,
}: BuildChatSystemPromptOptions): string {
  const language = LOCALE_LANGUAGE[locale] ?? "English";
  const accountsContext = buildConnectedAccountsContext(connectedAccounts);

  const parts = [
    "You are Claude, the AI assistant inside Posty — a social media scheduling app.",
    userName ? `The user's name is ${userName}.` : "",
    "",
    "Your job:",
    "- Understand what the user wants to create, refine, or schedule.",
    "- Draft captions, hooks, hashtags, and post ideas tailored to each platform.",
    "- Ask short clarifying questions when platform, timing, or message is unclear.",
    "- Prefer concrete drafts over generic advice.",
    "",
    "Current capabilities:",
    "- Chat (text and voice transcript)",
    "- Upload photos in chat (Claude can see images; videos are referenced by link)",
    "- OAuth-connected social accounts",
    "- Brand profile aware copywriting",
    "- Save scheduled posts to the Posty calendar (Upcoming posts + calendar dots) when the user confirms platform, caption, and date/time",
    higgsfieldConfigured
      ? "- Generate images via Higgsfield when the user asks (image URL may be provided in context)"
      : null,
    "",
    "Not available yet (do not claim you can do these now):",
    "- Publishing posts directly to social platforms (scheduling to Posty calendar works)",
    higgsfieldConfigured ? null : "- Generating images or videos (Higgsfield not configured yet)",
    higgsfieldConfigured ? "- Generating videos (coming soon)" : null,
    "",
    "When the user wants to schedule, help draft the caption, confirm platform and datetime, then tell them Posty will save it to the calendar once details are clear.",
    mediaContext ? "" : null,
    mediaContext ?? null,
    "",
    accountsContext,
  ];

  if (brandContext?.trim()) {
    parts.push("", "User brand profile:", brandContext.trim());
  }

  parts.push(
    "",
    `Reply in ${language} unless the user writes in another language.`,
    "Keep replies concise, friendly, and actionable. Use short paragraphs or bullet lists when helpful.",
  );

  return parts.filter(Boolean).join("\n");
}

export function trimChatHistory<T extends { role: string; content: string }>(
  messages: T[],
  maxMessages = 20,
): T[] {
  if (messages.length <= maxMessages) {
    return messages;
  }

  return messages.slice(-maxMessages);
}

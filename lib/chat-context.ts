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
      "If the user asks to post somewhere that is not connected, briefly tell them to connect it from Accounts — then stop.",
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
    "You are Posty — a warm, confident social media assistant inside the Posty app.",
    userName ? `The user's name is ${userName}. Use it naturally sometimes.` : "",
    "",
    "Personality:",
    "- Friendly, direct, zero bureaucracy. Talk like a helpful creative friend.",
    "- NEVER ask clarifying questions when you can make a reasonable choice.",
    "- NEVER say \"Pe ce platformă?\" or \"Ce caption vrei?\" — just draft and act.",
    "- If the user attached a photo and wants a caption or post: write the caption immediately.",
    "- Default to SHORT captions. Gen-Z style when the brand is casual/funny or the user hints at it (hooks like \"Ai curaj să porți asta? Îndrăznește.\").",
    "- Normal style otherwise: 1-3 sentences + hashtags.",
    "",
    "Your job:",
    "- Draft captions, hooks, and hashtags — deliver them ready to copy/paste.",
    "- When the user says postează/publică/pune/trimite + platform: assume they want action, not a questionnaire.",
    "- Prefer one strong caption over multiple options unless the user asks for variants.",
    "",
    "Romanian intent words you must understand:",
    "- postează, postez, publică, publica, pune, trimite, bagă, urcă = publish now",
    "- programează, planifică, pune în calendar = schedule",
    "- fa/fă o descriere, scrie caption = generate caption (do it, don't ask)",
    "",
    "Current capabilities:",
    "- Chat (text and voice transcript)",
    "- Upload photos in chat (you can see images)",
    "- OAuth-connected social accounts",
    "- Brand profile aware copywriting",
    "- Auto-save scheduled posts when platform, caption, and date/time are clear",
    "- Publish now: \"postează pe instagram\", \"pune asta pe ig\", \"publică acum\", etc.",
    "- Schedule: \"programează mâine la 18 pe youtube\", etc.",
    higgsfieldConfigured
      ? "- Generate images via Higgsfield when asked (image URL may appear in context)"
      : null,
    "",
    "Not available yet:",
    "- X or Bluesky publishing",
    higgsfieldConfigured ? null : "- AI image/video generation",
    higgsfieldConfigured ? "- Video generation (coming soon)" : null,
    "",
    "Publishing & scheduling rules:",
    "- Never claim a post was saved or published unless context says SUCCESS or lists results.",
    "- Do NOT say you are waiting or will come back later — Posty acts synchronously.",
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
    "Keep replies short and warm. Use emoji sparingly (0-2). No bullet lists unless listing hashtags.",
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

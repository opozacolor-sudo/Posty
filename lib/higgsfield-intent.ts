export type ImageAspectRatio = "1:1" | "9:16" | "16:9" | "4:5";

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export function formatHiggsfieldError(error: unknown): string {
  if (error instanceof Error) {
    const apiError = error as Error & {
      statusCode?: number;
      responseData?: unknown;
    };

    if (typeof apiError.statusCode === "number") {
      const body =
        apiError.responseData !== undefined
          ? JSON.stringify(apiError.responseData)
          : apiError.message;
      return `${error.constructor.name} (${apiError.statusCode}): ${body}`;
    }

    const name = error.constructor.name;
    if (name !== "Error") {
      return `${name}: ${error.message}`;
    }

    return error.message;
  }

  return String(error);
}

export function getHiggsfieldClientConfig(): {
  apiKey: string;
  apiSecret: string;
} | null {
  const apiKey = process.env.HF_API_KEY?.trim();
  const apiSecret = process.env.HF_API_SECRET?.trim();
  if (apiKey && apiSecret) {
    return { apiKey, apiSecret };
  }

  const legacyCombined = process.env.HIGGSFIELD_API_KEY?.trim();
  if (legacyCombined) {
    const legacyColon = legacyCombined.indexOf(":");
    if (legacyColon > 0 && legacyColon < legacyCombined.length - 1) {
      return {
        apiKey: legacyCombined.slice(0, legacyColon),
        apiSecret: legacyCombined.slice(legacyColon + 1),
      };
    }
  }

  const combined = process.env.HF_CREDENTIALS?.trim();
  if (!combined) {
    return null;
  }

  const colonIndex = combined.indexOf(":");
  if (colonIndex <= 0 || colonIndex === combined.length - 1) {
    return null;
  }

  return {
    apiKey: combined.slice(0, colonIndex),
    apiSecret: combined.slice(colonIndex + 1),
  };
}

export function resolveAspectRatio(text: string): ImageAspectRatio {
  if (/story|stories|povest|reels?|9:16|vertical|tiktok/i.test(text)) {
    return "9:16";
  }

  if (/16:9|landscape|youtube|wide/i.test(text)) {
    return "16:9";
  }

  if (/4:5|portrait post/i.test(text)) {
    return "4:5";
  }

  return "1:1";
}

export function historyHasGeneratedImage(history: ChatTurn[]): boolean {
  return history.some(
    (turn) =>
      turn.content.includes("[Posty generated image:") ||
      /https:\/\/[^\s]+cloudfront\.net[^\s]*/i.test(turn.content),
  );
}

function conversationMentionsImageIntent(history: ChatTurn[]): boolean {
  const userText = history
    .filter((turn) => turn.role === "user")
    .map((turn) => turn.content)
    .join(" ");

  return (
    userWantsImageGeneration(userText) ||
    /\b(story|povest)\b.*\b(instagram|ig)\b/i.test(userText) ||
    /\b(instagram|ig)\b.*\b(story|povest|imagine|poz[aă])\b/i.test(userText) ||
    /\b(vibe|var[aă]|city|urban)\b.*\b(story|instagram|ig)\b/i.test(userText)
  );
}

function getLastAssistantMessage(history: ChatTurn[]): ChatTurn | undefined {
  return [...history].reverse().find((turn) => turn.role === "assistant");
}

function assistantAskedClarifyingQuestion(content: string): boolean {
  return (
    content.includes("?") &&
    /\b(stil|style|imagine|story|povest|vibe|detali|prefer|vil?i|cum|ce|personaj|element|fundal|culori|ton)\b/i.test(
      content,
    )
  );
}

function buildCombinedImagePrompt(userMessages: string[]): string {
  return userMessages.map((message) => message.trim()).filter(Boolean).join(". ");
}

export function resolveImageGenerationIntent(
  history: ChatTurn[],
  lastUserMessage: string,
): { shouldGenerate: boolean; prompt: string; aspectRatio: ImageAspectRatio } {
  const explicitNewRequest = userWantsImageGeneration(lastUserMessage);

  if (historyHasGeneratedImage(history) && !explicitNewRequest) {
    return { shouldGenerate: false, prompt: "", aspectRatio: "1:1" };
  }

  const conversationText = history.map((turn) => turn.content).join("\n");
  const userMessages = history.filter((turn) => turn.role === "user");

  if (userWantsImageGeneration(lastUserMessage)) {
    const lastAssistant = getLastAssistantMessage(history);
    const awaitingDetails =
      lastAssistant &&
      assistantAskedClarifyingQuestion(lastAssistant.content) &&
      userMessages.length > 1;

    if (awaitingDetails) {
      const startIndex = userMessages.findIndex((turn) =>
        userWantsImageGeneration(turn.content),
      );
      const threadStart = startIndex >= 0 ? startIndex : 0;
      const prompt = buildCombinedImagePrompt(
        userMessages.slice(threadStart).map((turn) => turn.content),
      );

      return {
        shouldGenerate: true,
        prompt,
        aspectRatio: resolveAspectRatio(conversationText),
      };
    }

    return {
      shouldGenerate: true,
      prompt: buildImagePromptFromMessage(lastUserMessage),
      aspectRatio: resolveAspectRatio(conversationText),
    };
  }

  let imageRequestIndex = -1;

  for (let index = userMessages.length - 1; index >= 0; index -= 1) {
    if (userWantsImageGeneration(userMessages[index].content)) {
      imageRequestIndex = index;
      break;
    }
  }

  if (imageRequestIndex === -1 && conversationMentionsImageIntent(history)) {
    imageRequestIndex = 0;
  }

  if (imageRequestIndex === -1) {
    return { shouldGenerate: false, prompt: "", aspectRatio: "1:1" };
  }

  const refinements = userMessages.slice(imageRequestIndex + 1);
  if (refinements.length === 0) {
    return { shouldGenerate: false, prompt: "", aspectRatio: "1:1" };
  }

  const lastAssistant = getLastAssistantMessage(history);
  if (!lastAssistant || !assistantAskedClarifyingQuestion(lastAssistant.content)) {
    return { shouldGenerate: false, prompt: "", aspectRatio: "1:1" };
  }

  const lastRefinement = refinements[refinements.length - 1]?.content.trim();
  if (lastRefinement !== lastUserMessage.trim()) {
    return { shouldGenerate: false, prompt: "", aspectRatio: "1:1" };
  }

  const prompt = buildCombinedImagePrompt(
    userMessages.slice(imageRequestIndex).map((turn) => turn.content),
  );

  return {
    shouldGenerate: true,
    prompt,
    aspectRatio: resolveAspectRatio(conversationText),
  };
}

/** Romanian verbs with diacritics — avoid \\b (JS treats ă/â/î/ș/ț as non-word). */
const RO_IMAGE_VERB =
  /(?:genereaz[aă]|genereaza|creeaz[aă]|creeaza|f[aă]|fa)\s+(?:o\s+|un[aă]\s+)?(?:imagine|poz[aă]|poza|photo|image|picture|grafic)/iu;

const RO_IMAGE_NOUN =
  /(?:imagine|poz[aă]|poza)\s+(?:pentru|for|on|cu|de\s)/iu;

const RO_STORY =
  /(?:story|povest(?:e|i)?)\s+(?:pe\s+|on\s+|for\s+)?(?:instagram|ig)\b|(?:instagram|ig)\s+.*(?:story|povest)/iu;

const EN_IMAGE =
  /\b(?:make|create|generate)\b[\s\S]{0,40}\b(?:image|photo|picture|graphic)\b/i;

const EN_VIDEO =
  /\b(?:make|create|generate)\b[\s\S]{0,40}\b(?:video|clip|reel)\b/i;

const RO_VIDEO =
  /(?:genereaz[aă]|genereaza|creeaz[aă]|creeaza|f[aă]|fa)\s+(?:un\s+|o\s+)?(?:video|clip|reel)/iu;

export function buildImagePromptFromMessage(message: string): string {
  const cleaned = message
    .replace(
      /^(?:please\s+)?(?:genereaz[aă]|genereaza|creeaz[aă]|creeaza|f[aă]|fa|make|create|generate)\s+(?:o\s+|un[aă]\s+)?(?:imagine|poz[aă]|poza|photo|image|picture|grafic)\s*(?:pentru|for|on|de\s+|cu\s+)?/iu,
      "",
    )
    .trim();

  return cleaned || message.trim();
}

export function userWantsImageGeneration(message: string): boolean {
  return (
    RO_IMAGE_VERB.test(message) ||
    EN_IMAGE.test(message) ||
    RO_IMAGE_NOUN.test(message) ||
    RO_STORY.test(message)
  );
}

export function userWantsVideoGeneration(message: string): boolean {
  return RO_VIDEO.test(message) || EN_VIDEO.test(message);
}

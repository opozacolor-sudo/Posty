export type ImageAspectRatio = "1:1" | "9:16" | "16:9" | "4:5";

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export function formatHiggsfieldError(error: unknown): string {
  if (error instanceof Error) {
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

export function resolveImageGenerationIntent(
  history: ChatTurn[],
  lastUserMessage: string,
): { shouldGenerate: boolean; prompt: string; aspectRatio: ImageAspectRatio } {
  const conversationText = history.map((turn) => turn.content).join("\n");

  if (userWantsImageGeneration(lastUserMessage)) {
    return {
      shouldGenerate: true,
      prompt: buildImagePromptFromMessage(lastUserMessage),
      aspectRatio: resolveAspectRatio(conversationText),
    };
  }

  const userMessages = history.filter((turn) => turn.role === "user");
  let imageRequestIndex = -1;

  for (let index = userMessages.length - 1; index >= 0; index -= 1) {
    if (userWantsImageGeneration(userMessages[index].content)) {
      imageRequestIndex = index;
      break;
    }
  }

  if (imageRequestIndex === -1) {
    return { shouldGenerate: false, prompt: "", aspectRatio: "1:1" };
  }

  const refinements = userMessages
    .slice(imageRequestIndex + 1)
    .map((turn) => turn.content.trim())
    .filter(Boolean);

  if (refinements.length === 0) {
    return { shouldGenerate: false, prompt: "", aspectRatio: "1:1" };
  }

  const basePrompt = buildImagePromptFromMessage(userMessages[imageRequestIndex].content);
  const prompt = [basePrompt, ...refinements].join(". ");

  return {
    shouldGenerate: true,
    prompt,
    aspectRatio: resolveAspectRatio(conversationText),
  };
}

export function buildImagePromptFromMessage(message: string): string {
  const cleaned = message
    .replace(
      /^(please\s+)?(genereaz[aă]|creeaz[aă]|f[aă]|make|create|generate)\s+(o\s+)?(imagine|poz[aă]|photo|image|picture|grafic)\s*(pentru|for|on|de\s)?/i,
      "",
    )
    .trim();

  return cleaned || message.trim();
}

export function userWantsImageGeneration(message: string): boolean {
  const lower = message.toLowerCase();

  return (
    /\b(genereaz[aă]|creeaz[aă]|f[aă])\b.*\b(imagine|poz[aă]|photo|image|grafic)\b/i.test(
      message,
    ) ||
    /\b(make|create|generate)\b.*\b(image|photo|picture|graphic)\b/i.test(lower) ||
    /\b(imagine|poz[aă])\b.*\b(pentru|for|on)\b/i.test(lower) ||
    /\b(story|povest)\b.*\b(instagram|ig)\b/i.test(lower) ||
    /\b(instagram|ig)\b.*\b(story|povest)\b/i.test(lower)
  );
}

export function userWantsVideoGeneration(message: string): boolean {
  return (
    /\b(genereaz[aă]|creeaz[aă]|f[aă])\b.*\b(video|clip|reel)\b/i.test(message) ||
    /\b(make|create|generate)\b.*\b(video|clip|reel)\b/i.test(message.toLowerCase())
  );
}

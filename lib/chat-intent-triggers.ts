/** Shared Romanian/English chat triggers for publish vs schedule intent. */

export const POST_NOW_VERB =
  /\b(?:posteaz[aă]?|postez|post)\s+acum\b|\b(?:publish|post)\s+now\b|\bpublic[aă]\s+acum\b|\btrimite\s+acum\b|\b(?:pune|pune-l|pune-o)\s+(?:acum|live)\b/i;

export const POST_ACTION_VERB =
  /\b(?:posteaz[aă]?|postez|post(?:ati|at|e)?|public[aă]|publica|trimite|pune(?:-l|-o|-le)?|upload(?:eaz[aă]?|ez)?|share|distribuie|bag[aă]|baga)\b/i;

export const SCHEDULE_TIME_HINT =
  /\b(?:mâine|maine|tomorrow|poimâine|poimaine|azi|today|săptămâna|saptamana|next week|luni|mar[tț]i|miercuri|joi|vineri|sâmbăt[aă]|sambata|duminic[aă]|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}[:h.]\d{2}|\bla\s+\d{1,2}|pe\s+\d{1,2}|în\s+calendar|in\s+calendar|ora\s+\d)\b/i;

export const SCHEDULE_ACTION_VERB =
  /\b(?:programeaz[aă]?|program(?:ez|are|at|ezi)?|planific[aă]?|plan(?:ez|ific)?|schedul(?:e|ing)|pune(?:\s+)?(?:în|in)\s+calendar|salveaz[aă]?\s+(?:în|in)\s+calendar|salveaz[aă]?\s+post|pune(?:\s+)?pe\s+calendar)\b/i;

export const PLATFORM_NAME_PATTERN =
  /\b(instagram|insta|\big\b|facebook|fb|linkedin|threads|pinterest|tiktok|youtube|\byt\b|twitter|\bx\b|bluesky)\b/i;

export const PUBLISH_CONFIRM_NOW =
  /^(?:acum|now)[\s!.?,]*$|^\s*(?:da|yes|ok|okay|sigur|perfect|mergi|confirm[aă]?)[,!.?\s]*(?:acum|now)?[\s!.?,]*$/i;

export const SCHEDULE_CONFIRM_ONLY =
  /^(?:da|yes|yep|ok|okay|confirm[aă]?|sigur|perfect|mergi|save|salveaz[aă])[\s!.?,]*$/i;

export function messageMentionsScheduleTime(message: string): boolean {
  return SCHEDULE_TIME_HINT.test(message);
}

export function messageWantsPublishAction(message: string): boolean {
  if (POST_NOW_VERB.test(message)) {
    return true;
  }

  if (!POST_ACTION_VERB.test(message)) {
    return false;
  }

  if (messageMentionsScheduleTime(message) && !POST_NOW_VERB.test(message)) {
    return false;
  }

  if (SCHEDULE_ACTION_VERB.test(message) && !POST_NOW_VERB.test(message)) {
    return false;
  }

  return (
    PLATFORM_NAME_PATTERN.test(message) ||
    /\b(?:pe\s+toate|toate\s+(?:re[tț]elele|platformele|conturile)|all\s+(?:connected|networks|platforms))\b/i.test(
      message,
    ) ||
    /\b(?:cu\s+(?:textul|caption|descrierea)|with\s+(?:the\s+)?(?:text|caption))\b/i.test(
      message,
    )
  );
}

export function messageWantsScheduleAction(message: string): boolean {
  if (SCHEDULE_ACTION_VERB.test(message)) {
    return true;
  }

  if (POST_ACTION_VERB.test(message) && messageMentionsScheduleTime(message)) {
    return true;
  }

  return /\b(?:calendar|programare|scheduled?\s+for)\b/i.test(message);
}

export function userConfirmsPublishNow(message: string): boolean {
  const trimmed = message.trim();
  return PUBLISH_CONFIRM_NOW.test(trimmed) || POST_NOW_VERB.test(trimmed);
}

export function userConfirmsSchedule(message: string): boolean {
  const trimmed = message.trim();
  return (
    SCHEDULE_CONFIRM_ONLY.test(trimmed) ||
    /\b(?:da,?\s*(?:programeaz|salveaz|confirm)|yes,?\s*(?:schedule|save|confirm))\b/i.test(
      trimmed,
    )
  );
}

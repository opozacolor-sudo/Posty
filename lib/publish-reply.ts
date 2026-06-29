export function formatPublishUserReply(
  summary: string,
  locale: string,
  anySuccess: boolean,
): string {
  if (locale === "ro") {
    const lead = anySuccess
      ? "Gata — publicarea s-a terminat. Rezultat pe fiecare platformă:"
      : "Publicarea nu a reușit. Detalii pe fiecare platformă:";
    return `${lead}\n\n---\n${summary}`;
  }

  const lead = anySuccess
    ? "Done — publishing finished. Per-platform results:"
    : "Publishing did not succeed. Per-platform details:";
  return `${lead}\n\n---\n${summary}`;
}

export function formatPublishMissingDetailsReply(locale: string): string {
  if (locale === "ro") {
    return [
      "Nu am putut publica — îmi lipsesc detalii din conversație.",
      "",
      "Verifică:",
      "- ai atașat poza sau videoul cu 📎",
      "- există un caption (text + hashtag-uri) în chat",
      "",
      "Apoi scrie: „postează pe youtube”, „postează pe tiktok” sau „postează pe instagram”.",
    ].join("\n");
  }

  return [
    "Could not publish — missing details from the conversation.",
    "",
    "Check:",
    "- you attached a photo or video with 📎",
    "- a caption exists in the chat",
    "",
    "Then try: “post on youtube”, “post on tiktok”, or “post on instagram”.",
  ].join("\n");
}

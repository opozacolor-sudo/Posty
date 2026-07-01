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
      "Pentru retry doar unde a eșuat: „reîncearcă doar unde nu s-a postat” (după un rezumat de publicare în chat).",
      "Sau spune explicit: „postează doar pe tiktok, linkedin și facebook”.",
    ].join("\n");
  }

  return [
    "Could not publish — missing details from the conversation.",
    "",
    "Check:",
    "- you attached a photo or video with 📎",
    "- a caption exists in the chat",
    "",
    "To retry failed platforms only: “retry only where it failed” (after a publish summary in chat).",
    "Or say explicitly: “post only on tiktok, linkedin and facebook”.",
  ].join("\n");
}

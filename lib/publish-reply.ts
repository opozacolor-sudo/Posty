export function formatPublishUserReply(
  summary: string,
  locale: string,
  anySuccess: boolean,
  caption?: string,
  showCaption = true,
): string {
  if (locale === "ro") {
    const lead = anySuccess
      ? "Gata! Am postat pentru tine ✨"
      : "Nu a mers peste tot — iată detaliile:";
    const captionBlock =
      showCaption && caption?.trim()
        ? `\n\n📝 Caption:\n${caption.trim()}`
        : "";
    return `${lead}${captionBlock}\n\n---\n${summary}`;
  }

  const lead = anySuccess
    ? "Done! Posted for you ✨"
    : "Didn't work everywhere — here's what happened:";
  const captionBlock =
    showCaption && caption?.trim() ? `\n\n📝 Caption:\n${caption.trim()}` : "";
  return `${lead}${captionBlock}\n\n---\n${summary}`;
}

export function formatPublishMissingDetailsReply(locale: string): string {
  if (locale === "ro") {
    return [
      "Nu am reușit să public — îmi lipsește poza sau platforma.",
      "",
      "Atașează 📎 o poză și spune de exemplu:",
      "„postează pe instagram” sau „fa o descriere și postează pe ig”",
    ].join("\n");
  }

  return [
    "Couldn't publish — missing a photo or platform.",
    "",
    "Attach 📎 a photo and say for example:",
    "\"post on instagram\" or \"write a caption and post on ig\"",
  ].join("\n");
}

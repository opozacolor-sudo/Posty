import type { HowItWorksContent } from "./types";
import { getHowItWorksEn } from "./how-it-works-en";
import { getHowItWorksRo } from "./how-it-works-ro";

export function getHowItWorksContent(locale: string): HowItWorksContent {
  return locale === "ro" ? getHowItWorksRo() : getHowItWorksEn();
}

export type { HowItWorksContent, HowItWorksPlatform, HowItWorksFormat } from "./types";

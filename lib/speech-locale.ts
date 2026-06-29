import { routing, type Locale } from "@/i18n/routing";

const SPEECH_LOCALE_MAP: Record<Locale, string> = {
  ro: "ro-RO",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  it: "it-IT",
  pt: "pt-PT",
  ru: "ru-RU",
  ja: "ja-JP",
  ko: "ko-KR",
  zh: "zh-CN",
  ar: "ar-SA",
  hi: "hi-IN",
};

export function resolveSpeechRecognitionLang(
  locale: string | undefined,
  htmlLang: string | undefined,
): string {
  if (locale && routing.locales.includes(locale as Locale)) {
    return SPEECH_LOCALE_MAP[locale as Locale];
  }

  if (htmlLang && htmlLang in SPEECH_LOCALE_MAP) {
    return SPEECH_LOCALE_MAP[htmlLang as Locale];
  }

  if (htmlLang?.includes("-")) {
    return htmlLang;
  }

  return SPEECH_LOCALE_MAP[routing.defaultLocale];
}

export function isBrowserSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;

  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

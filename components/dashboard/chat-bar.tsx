"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  useSpeechInput,
  type SpeechInputError,
} from "@/hooks/use-speech-input";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
};

export function ChatBar() {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: t("chatWelcome"),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [chatModeNotice, setChatModeNotice] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const fetchReply = useCallback(
    async (
      history: Array<{ role: "user" | "assistant"; content: string }>,
    ): Promise<{ text: string; imageUrl?: string }> => {
      if (history.length === 0) {
        return { text: t("chatError") };
      }

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          redirect: "manual",
          body: JSON.stringify({ messages: history, locale }),
        });

        if (response.type === "opaqueredirect" || response.status === 307 || response.status === 302) {
          return { text: t("chatSessionExpired") };
        }

        if (response.status === 401) {
          return { text: t("chatSessionExpired") };
        }

        let data: {
          reply?: string;
          error?: string;
          source?: "claude" | "mock" | "error";
          configured?: boolean;
          generatedImageUrl?: string;
        };

        try {
          data = (await response.json()) as typeof data;
        } catch {
          return { text: t("chatError") };
        }

        if (data.source === "mock" && data.configured === false) {
          setChatModeNotice(t("chatNotConfigured"));
        } else if (data.source === "claude") {
          setChatModeNotice(null);
        }

        if (response.ok && data.reply) {
          return {
            text: data.reply,
            imageUrl: data.generatedImageUrl,
          };
        }

        if (data.source === "mock" && data.reply) {
          return { text: data.reply };
        }
      } catch {
        // Network failure — show translated error below.
      }

      return { text: t("chatError") };
    },
    [locale, t],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoadingRef.current) return;

      isLoadingRef.current = true;
      setIsLoading(true);
      setVoiceNotice(null);
      setInput("");

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
      };

      const nextMessages = [...messagesRef.current, userMessage];
      const history = nextMessages
        .filter((message) => message.id !== "welcome")
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));

      setMessages(nextMessages);

      const reply = await fetchReply(history);

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: reply.text,
          imageUrl: reply.imageUrl,
        },
      ]);

      isLoadingRef.current = false;
      setIsLoading(false);
    },
    [fetchReply],
  );

  const handleVoiceError = useCallback(
    (error: SpeechInputError) => {
      const keyMap: Record<SpeechInputError, string> = {
        not_supported: "voiceNotSupported",
        permission_denied: "voicePermissionDenied",
        no_speech: "voiceNoSpeech",
        network: "voiceNetworkError",
        transcribe_failed: "voiceTranscribeFailed",
        unknown: "voiceError",
      };

      setVoiceNotice(t(keyMap[error]));
    },
    [t],
  );

  const { isListening, mode, toggleListening } = useSpeechInput({
    onInterim: (text) => {
      setInput(text);
      setVoiceNotice(t("voiceListening"));
    },
    onTranscript: (text) => {
      setInput(text);
      void sendMessage(text);
    },
    onError: handleVoiceError,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void sendMessage(input);
  }

  return (
    <div className="chat-panel flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-white px-3 py-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-coral">
          <svg
            className="h-3.5 w-3.5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>
        <div>
          <p className="text-xs font-bold leading-tight">{t("assistantName")}</p>
          <p className="text-[10px] text-green">
            {isLoading
              ? t("chatThinking")
              : isListening
                ? t("voiceListening")
                : t("chatOnline")}
          </p>
          {chatModeNotice && (
            <p className="text-[10px] text-muted-foreground">{chatModeNotice}</p>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-white px-3 py-2">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-3 py-1.5 text-xs leading-relaxed md:text-[13px] ${
                  message.role === "user"
                    ? "bg-coral font-medium text-white"
                    : "bg-card text-foreground"
                }`}
              >
                {message.content}
                {message.imageUrl && (
                  <a
                    href={message.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block overflow-hidden rounded-xl"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={message.imageUrl}
                      alt=""
                      className="max-h-48 w-full object-cover"
                    />
                  </a>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-card px-3 py-1.5 text-xs text-muted-foreground">
                {t("chatThinking")}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-border bg-white px-3 py-2"
      >
        {voiceNotice && (
          <p
            className={`mx-auto mb-2 max-w-3xl text-center text-[11px] ${
              isListening ? "font-medium text-coral" : "text-muted-foreground"
            }`}
          >
            {voiceNotice}
            {isListening && mode === "recording" ? ` · ${t("voiceTapToStop")}` : null}
          </p>
        )}

        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isListening ? t("voiceListeningPlaceholder") : t("chatPlaceholder")
            }
            disabled={isLoading}
            className="input-field flex-1 rounded-full px-4 py-2.5 text-sm disabled:opacity-60"
          />

          <button
            type="button"
            onClick={toggleListening}
            disabled={isLoading}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-60 ${
              isListening
                ? "animate-pulse bg-coral text-white"
                : "bg-card text-foreground hover:bg-border"
            }`}
            aria-label={isListening ? t("voiceStop") : t("voiceInput")}
            aria-pressed={isListening}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </button>

          <button
            type="submit"
            disabled={!input.trim() || isLoading || isListening}
            className="btn-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full p-0 disabled:opacity-60"
            aria-label={t("send")}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </form>

      <footer className="shrink-0 border-t border-border bg-white px-3 py-2 text-center text-[10px] leading-relaxed text-muted-foreground">
        <Link href="/privacy" className="hover:text-foreground">
          {t("privacyPolicy")}
        </Link>
        <span className="mx-1.5">·</span>
        <Link href="/terms" className="hover:text-foreground">
          {t("termsOfService")}
        </Link>
        <span className="mx-1.5">·</span>
        <span>{t("copyright")}</span>
      </footer>
    </div>
  );
}

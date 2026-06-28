"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function ChatBar() {
  const t = useTranslations("dashboard");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: t("chatWelcome"),
    },
  ]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function getClaudeReply(userMessage: string): string {
    const lower = userMessage.toLowerCase();

    if (lower.includes("instagram") || lower.includes("post")) {
      return t("chatReplyPost");
    }
    if (lower.includes("schedule") || lower.includes("program")) {
      return t("chatReplySchedule");
    }
    if (lower.includes("stat") || lower.includes("analiz")) {
      return t("chatReplyStats");
    }

    return t("chatReplyDefault");
  }

  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: trimmed },
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: getClaudeReply(trimmed),
      },
    ]);
    setInput("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function toggleVoice() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      sendMessage(t("voiceNotSupported"));
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = document.documentElement.lang || "en";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        setInput(transcript);
        sendMessage(transcript);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
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
          <p className="text-[10px] text-green">{t("chatOnline")}</p>
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
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-border bg-white px-3 py-2"
      >
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("chatPlaceholder")}
            className="input-field flex-1 rounded-full px-4 py-2.5 text-sm"
          />

          <button
            type="button"
            onClick={toggleVoice}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
              isListening
                ? "bg-coral text-white"
                : "bg-card text-foreground hover:bg-border"
            }`}
            aria-label={t("voiceInput")}
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
            disabled={!input.trim()}
            className="btn-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full p-0"
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

"use client";

import { useState } from "react";
import { normalizeHashtag } from "@/lib/brand-profile";

type TagsInputProps = {
  id: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
};

export function TagsInput({ id, value, onChange, placeholder }: TagsInputProps) {
  const [input, setInput] = useState("");

  function addTag(raw: string) {
    const tag = normalizeHashtag(raw);
    if (!tag || value.includes(tag)) return;
    onChange([...value, tag]);
    setInput("");
  }

  function removeTag(tag: string) {
    onChange(value.filter((item) => item !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="input-field min-h-[42px] py-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-coral/10 px-2 py-0.5 text-xs font-medium text-coral"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded-full leading-none hover:opacity-70"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/,/g, ""))}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (input.trim()) addTag(input);
          }}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[120px] flex-1 bg-transparent text-sm outline-none"
        />
      </div>
    </div>
  );
}

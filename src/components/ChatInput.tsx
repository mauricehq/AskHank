"use client";

import { useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface ChatInputProps {
  onSend: (text: string) => void;
  hasMessages: boolean;
  disabled?: boolean;
  outOfCredits?: boolean;
  centered?: boolean;
}

export function ChatInput({ onSend, hasMessages, disabled, outOfCredits, centered }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const trimmed = value.trim();
  const canSend = trimmed.length > 0 && !disabled && !outOfCredits;

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const handleSend = () => {
    if (!canSend) return;
    onSend(trimmed);
    setValue("");
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isDesktop) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const box = (
    <div className="w-full rounded-2xl border border-border bg-bg-surface">
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          adjustHeight();
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled || outOfCredits}
        placeholder={outOfCredits ? "Out of credits" : hasMessages ? "Make your case." : "What do you want to buy?"}
        rows={1}
        className={`min-h-[52px] max-h-[30vh] w-full resize-none overflow-auto scrollbar-thin bg-transparent px-5 pt-4 pb-1 text-base text-text outline-none placeholder:text-text-secondary md:min-h-[56px] md:max-h-[200px] md:text-[0.95rem] ${disabled ? "opacity-50" : ""}`}
      />

      {/* Bottom bar with send button */}
      <div className="flex items-center justify-end px-4 py-3">
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-user-text transition-opacity active:scale-[0.97] ${
            !canSend ? "opacity-30 pointer-events-none" : ""
          }`}
          aria-label="Send message"
        >
          <ArrowUp size={16} />
        </button>
      </div>
    </div>
  );

  if (centered) return box;

  return (
    <div className="bg-bg/90 backdrop-blur">
      <div className="mx-auto max-w-[800px] px-4 py-3 md:py-4">
        {box}
      </div>
    </div>
  );
}

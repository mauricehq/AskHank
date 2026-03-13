"use client";

import { useRef, useState } from "react";
import { ArrowUp, Camera } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface ChatInputProps {
  onSend: (text: string) => void;
  hasMessages: boolean;
  disabled?: boolean;
  outOfCredits?: boolean;
}

export function ChatInput({ onSend, hasMessages, disabled, outOfCredits }: ChatInputProps) {
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
    // Reset textarea height after send
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isDesktop) return; // Mobile: Enter always inserts newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-[720px] items-end gap-2 px-4 py-3 md:py-4">
        {/* Camera button (placeholder) */}
        <button
          disabled
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-border bg-transparent text-text-secondary opacity-50 md:h-10 md:w-10"
          aria-label="Attach photo"
        >
          <Camera size={18} />
        </button>

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
          className={`min-h-[40px] max-h-[30vh] flex-1 resize-none overflow-auto rounded-xl border-[1.5px] border-border bg-input-bg px-3 py-2 text-base text-text outline-none placeholder:text-text-secondary focus:border-accent md:min-h-[44px] md:max-h-[200px] md:text-[0.9rem] ${disabled ? "opacity-50" : ""}`}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-accent text-user-text active:scale-[0.97] md:h-10 md:w-10 ${
            !canSend ? "opacity-50 pointer-events-none" : ""
          }`}
          aria-label="Send message"
        >
          <ArrowUp size={18} />
        </button>
      </div>
    </div>
  );
}

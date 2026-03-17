"use client";

import { ChevronDown } from "lucide-react";

interface ScrollToBottomProps {
  visible: boolean;
  onClick: () => void;
}

export function ScrollToBottom({ visible, onClick }: ScrollToBottomProps) {
  return (
    <button
      onClick={onClick}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={`absolute bottom-20 right-4 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border bg-bg-card shadow-lg transition-all duration-150 ${
        visible
          ? "scale-100 opacity-100 animate-[scroll-bounce_1.5s_ease-in-out_0.5s_2]"
          : "pointer-events-none scale-90 opacity-0"
      }`}
      aria-label="Scroll to bottom"
    >
      <ChevronDown size={16} className="text-text-secondary" />
    </button>
  );
}

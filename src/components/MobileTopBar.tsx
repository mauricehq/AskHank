"use client";

import { Menu } from "lucide-react";

interface MobileTopBarProps {
  onMenuClick: () => void;
}

export function MobileTopBar({ onMenuClick }: MobileTopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-bg px-4 md:hidden">
      {/* Hamburger */}
      <button
        onClick={onMenuClick}
        className="flex h-10 w-10 items-center justify-center rounded-[10px] text-text hover:bg-bg-surface"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Centered title */}
      <div className="absolute inset-x-0 flex justify-center pointer-events-none">
        <span className="text-base font-bold tracking-tight text-text">
          Ask <span className="text-accent">Hank</span>
        </span>
      </div>

      {/* Right spacer (credits placeholder for Phase 4) */}
      <div className="ml-auto w-10" />
    </header>
  );
}

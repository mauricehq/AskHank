"use client";

import { Check, X } from "lucide-react";

interface HistoryItemProps {
  name: string;
  verdict: "denied" | "approved";
  timeAgo: string;
  isActive?: boolean;
  onClick?: () => void;
}

export function HistoryItem({ name, verdict, timeAgo, isActive, onClick }: HistoryItemProps) {
  const isDenied = verdict === "denied";

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors hover:bg-bg-surface ${
        isActive ? "border-l-[3px] border-accent bg-bg-surface" : ""
      }`}
    >
      {/* Verdict icon */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          isDenied ? "bg-denied/10 text-denied" : "bg-approved/10 text-approved"
        }`}
      >
        {isDenied ? <X size={14} strokeWidth={2.5} /> : <Check size={14} strokeWidth={2.5} />}
      </div>

      {/* Name + time */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[0.85rem] font-bold text-text">{name}</div>
        <div className="text-[0.7rem] text-text-secondary">{timeAgo}</div>
      </div>

      {/* Verdict badge */}
      <span
        className={`shrink-0 rounded-md px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${
          isDenied ? "bg-denied/10 text-denied" : "bg-approved/10 text-approved"
        }`}
      >
        {verdict}
      </span>
    </button>
  );
}

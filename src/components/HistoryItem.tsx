"use client";

import { useState, useEffect } from "react";
import { Check, MessageCircle, Trash2, X } from "lucide-react";

interface HistoryItemProps {
  name: string;
  verdict?: "denied" | "approved";
  timeAgo: string;
  isActive?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
}

export function HistoryItem({ name, verdict, timeAgo, isActive, onClick, onDelete }: HistoryItemProps) {
  const isDenied = verdict === "denied";
  const isApproved = verdict === "approved";
  const [confirming, setConfirming] = useState(false);

  // Reset confirming state when the item changes (user navigated away)
  useEffect(() => {
    setConfirming(false);
  }, [name, isActive]);

  if (confirming) {
    return (
      <div
        className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 ${
          isActive ? "border-l-[3px] border-accent bg-bg-surface" : ""
        }`}
      >
        <span className="flex-1 text-[0.85rem] font-bold text-text">Delete conversation?</span>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-md px-2.5 py-1 text-[0.75rem] font-semibold text-text-secondary hover:bg-bg-surface"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onDelete?.();
            setConfirming(false);
          }}
          className="rounded-md bg-denied/10 px-2.5 py-1 text-[0.75rem] font-semibold text-denied hover:bg-denied/20"
        >
          Delete
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors hover:bg-bg-surface ${
        isActive ? "border-l-[3px] border-accent bg-bg-surface" : ""
      }`}
    >
      {/* Verdict icon */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          isDenied ? "bg-denied/10 text-denied" : isApproved ? "bg-approved/10 text-approved" : "bg-text-secondary/10 text-text-secondary"
        }`}
      >
        {isDenied ? <X size={14} strokeWidth={2.5} /> : isApproved ? <Check size={14} strokeWidth={2.5} /> : <MessageCircle size={14} strokeWidth={2.5} />}
      </div>

      {/* Name + time */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[0.85rem] font-bold text-text">{name}</div>
        <div className="text-[0.7rem] text-text-secondary">{timeAgo}</div>
      </div>

      {/* Trash icon (shown on hover, replaces verdict badge) */}
      {onDelete && (
        <div
          role="button"
          aria-label="Delete conversation"
          className="hidden shrink-0 cursor-pointer group-hover:flex"
          onClick={(e) => {
            e.stopPropagation();
            setConfirming(true);
          }}
        >
          <Trash2 size={14} className="text-text-secondary hover:text-denied" />
        </div>
      )}
      {verdict && (
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide group-hover:hidden ${
            isDenied ? "bg-denied/10 text-denied" : "bg-approved/10 text-approved"
          }`}
        >
          {verdict}
        </span>
      )}
    </button>
  );
}

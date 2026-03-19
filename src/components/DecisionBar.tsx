"use client";

import { ShoppingCart, Check, Clock } from "lucide-react";
import type { DecisionType } from "@/types/chat";

interface DecisionBarProps {
  onResolve: (decision: DecisionType) => void;
  disabled?: boolean;
}

export function DecisionBar({ onResolve, disabled }: DecisionBarProps) {
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-2">
      <span className="text-[0.65rem] font-medium uppercase tracking-wider text-text-secondary/60 mr-1">
        Ready?
      </span>
      <button
        onClick={() => onResolve("buying")}
        disabled={disabled}
        className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/8 px-3.5 py-1.5 text-[0.75rem] font-semibold text-accent hover:bg-accent/15 active:scale-[0.97] transition-colors disabled:opacity-50"
      >
        <ShoppingCart size={13} />
        Buying it
      </button>
      <button
        onClick={() => onResolve("skipping")}
        disabled={disabled}
        className="flex items-center gap-1.5 rounded-full border border-approved/30 bg-approved/8 px-3.5 py-1.5 text-[0.75rem] font-semibold text-approved hover:bg-approved/15 active:scale-[0.97] transition-colors disabled:opacity-50"
      >
        <Check size={13} />
        Skipping it
      </button>
      <button
        onClick={() => onResolve("thinking")}
        disabled={disabled}
        className="flex items-center gap-1.5 rounded-full border border-border bg-bg-surface px-3.5 py-1.5 text-[0.75rem] font-semibold text-text-secondary hover:bg-bg-surface/80 active:scale-[0.97] transition-colors disabled:opacity-50"
      >
        <Clock size={13} />
        Need to think
      </button>
    </div>
  );
}

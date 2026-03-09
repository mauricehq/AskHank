"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface ConversationPickerProps {
  selectedId: Id<"conversations"> | null;
  onSelect: (id: Id<"conversations">) => void;
}

export function ConversationPicker({
  selectedId,
  onSelect,
}: ConversationPickerProps) {
  const conversations = useQuery(api.admin.listConversations);

  if (conversations === undefined) {
    return (
      <div className="text-sm text-text-secondary">
        Loading conversations...
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-sm text-text-secondary">No conversations yet.</div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
        {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
      </div>
      <div className="max-h-[280px] overflow-y-auto space-y-1">
        {conversations.map((c) => (
          <button
            key={c._id}
            onClick={() => onSelect(c._id)}
            className={`w-full text-left rounded-[10px] border px-4 py-3 transition-colors ${
              selectedId === c._id
                ? "border-accent bg-accent/10"
                : "border-border bg-bg-card hover:border-accent/50"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="truncate text-sm font-medium text-text">
                {c.userName}
              </span>
              {c.verdict && (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    c.verdict === "approved"
                      ? "bg-approved/15 text-approved"
                      : "bg-denied/15 text-denied"
                  }`}
                >
                  {c.verdict}
                </span>
              )}
              {!c.verdict && c.status === "closed" && (
                <span className="shrink-0 rounded-full bg-bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase text-text-secondary">
                  closed
                </span>
              )}
              {!c.verdict && c.status !== "closed" && (
                <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-accent">
                  {c.status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-text-secondary">
              {c.category && <span>{c.category}</span>}
              {c.estimatedPrice != null && (
                <span>${c.estimatedPrice.toLocaleString()}</span>
              )}
              {c.score != null && <span>Score: {c.score}</span>}
              {c.stance && <span>{c.stance}</span>}
              <span className="ml-auto shrink-0">{relativeTime(c.createdAt)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

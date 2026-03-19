"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import { TraceDetail } from "./TraceDetail";

const DECISION_COLORS: Record<string, string> = {
  normal: "bg-blue-500/15 text-blue-400",
  casual: "bg-bg-surface text-text-secondary",
  "out-of-scope": "bg-bg-surface text-text-secondary",
  "directed-question": "bg-cyan-500/15 text-cyan-400",
  "non-answer-warning": "bg-yellow-500/15 text-yellow-400",
  "non-answer-disengaged": "bg-denied/15 text-denied",
  "stagnation-warning": "bg-yellow-500/15 text-yellow-400",
  "stagnation-disengaged": "bg-denied/15 text-denied",
  "auto-resolve-buying": "bg-approved/15 text-approved",
  "auto-resolve-skipping": "bg-approved/15 text-approved",
  "user-resolve-buying": "bg-approved/15 text-approved",
  "user-resolve-skipping": "bg-approved/15 text-approved",
  "user-resolve-thinking": "bg-approved/15 text-approved",
  error: "bg-denied/15 text-denied",
};

interface TraceTimelineProps {
  conversationId: Id<"conversations">;
}

export function TraceTimeline({ conversationId }: TraceTimelineProps) {
  const traces = useQuery(
    api.llmTraces.getTraceSummariesForConversation,
    { conversationId }
  );
  const messages = useQuery(api.admin.getConversationMessages, {
    conversationId,
  });
  const [expandedId, setExpandedId] = useState<Id<"llmTraces"> | null>(null);
  const [copied, setCopied] = useState(false);

  if (traces === undefined || messages === undefined) {
    return (
      <div className="text-sm text-text-secondary">Loading traces...</div>
    );
  }

  if (traces.length === 0) {
    return (
      <div className="text-sm text-text-secondary">
        No traces for this conversation.
      </div>
    );
  }

  // Build ordered messages and a lookup map
  const sortedMsgs = [...messages].sort((a, b) => a.createdAt - b.createdAt);
  const msgIndexById = new Map<string, number>();
  for (let i = 0; i < sortedMsgs.length; i++) {
    msgIndexById.set(sortedMsgs[i]._id, i);
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
        <span>{traces.length} trace{traces.length !== 1 ? "s" : ""}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(conversationId);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-text-secondary hover:text-text hover:bg-bg-surface transition-colors"
          title="Copy conversation ID"
        >
          {copied ? <Check size={10} /> : <Copy size={10} />}
          {copied ? "Copied" : "Copy ID"}
        </button>
      </div>
      {traces.map((trace, i) => {
        const isExpanded = expandedId === trace._id;
        // trace.messageId points to Hank's response; find the user message before it
        let userMsg: string | null = null;
        let hankMsg: string | null = null;
        if (trace.messageId) {
          const idx = msgIndexById.get(trace.messageId);
          if (idx !== undefined) {
            hankMsg = sortedMsgs[idx].content;
            if (idx > 0 && sortedMsgs[idx - 1].role === "user") {
              userMsg = sortedMsgs[idx - 1].content;
            }
          }
        }
        const decisionColor =
          DECISION_COLORS[trace.decisionType] ?? "bg-bg-surface text-text-secondary";

        return (
          <div key={trace._id}>
            <button
              onClick={() => setExpandedId(isExpanded ? null : trace._id)}
              className="w-full text-left rounded-[10px] border border-border bg-bg-card px-4 py-3 hover:border-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                {isExpanded ? (
                  <ChevronDown size={14} className="shrink-0 text-text-secondary" />
                ) : (
                  <ChevronRight size={14} className="shrink-0 text-text-secondary" />
                )}
                <span className="text-xs font-medium text-text">
                  Turn {i + 1}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${decisionColor}`}
                >
                  {trace.decisionType}
                </span>
                <span className="text-xs text-text-secondary">
                  {trace.previousIntensity} → {trace.newIntensity}
                </span>
                <span className="ml-auto text-xs text-text-secondary shrink-0">
                  {trace.durationMs}ms · {trace.tokenUsage.totalTokens} tok
                </span>
              </div>
              {userMsg && (
                <div className="ml-6 truncate text-xs text-text-secondary">
                  User: {userMsg}
                </div>
              )}
              {hankMsg && (
                <div className="ml-6 truncate text-xs text-text-secondary">
                  Hank: {hankMsg}
                </div>
              )}
              {trace.error && (
                <div className="ml-6 text-xs text-denied">
                  Error: {trace.error}
                </div>
              )}
            </button>

            {isExpanded && (
              <div className="ml-4 mt-1 mb-2">
                <TraceDetail traceId={trace._id} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

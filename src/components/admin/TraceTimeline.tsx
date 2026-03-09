"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ChevronDown, ChevronRight } from "lucide-react";
import { TraceDetail } from "./TraceDetail";

const DECISION_COLORS: Record<string, string> = {
  opening: "bg-accent/15 text-accent",
  response: "bg-blue-500/15 text-blue-400",
  concession: "bg-approved/15 text-approved",
  rejection: "bg-denied/15 text-denied",
  disengage: "bg-yellow-500/15 text-yellow-400",
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

  // Build a map of messageId → user message content (the message that triggered each trace)
  const messageMap = new Map<string, string>();
  for (const msg of messages) {
    messageMap.set(msg._id, msg.content);
  }

  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
        {traces.length} trace{traces.length !== 1 ? "s" : ""}
      </div>
      {traces.map((trace, i) => {
        const isExpanded = expandedId === trace._id;
        const triggerMsg = trace.messageId
          ? messageMap.get(trace.messageId)
          : null;
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
                  {trace.previousStance} → {trace.newStance}
                </span>
                <span className="ml-auto text-xs text-text-secondary shrink-0">
                  {trace.durationMs}ms · {trace.tokenUsage.totalTokens} tok
                </span>
              </div>
              {triggerMsg && (
                <div className="ml-6 truncate text-xs text-text-secondary">
                  User: {triggerMsg}
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

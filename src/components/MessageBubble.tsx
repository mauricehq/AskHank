"use client";

import { useState } from "react";
import type { Message, TraceSummary } from "@/types/chat";

interface MessageBubbleProps {
  message: Message;
  trace?: TraceSummary;
}

const DECISION_COLORS: Record<string, string> = {
  normal: "bg-blue-500/20 text-blue-300",
  "normal (stance floored)": "bg-blue-500/20 text-blue-300",
  casual: "bg-zinc-500/20 text-zinc-300",
  "out-of-scope": "bg-zinc-500/20 text-zinc-300",
  concede: "bg-green-500/20 text-green-300",
  "disengagement-increment": "bg-yellow-500/20 text-yellow-300",
  "disengagement-denied": "bg-red-500/20 text-red-300",
  "stagnation-increment": "bg-yellow-500/20 text-yellow-300",
  "stagnation-denied": "bg-red-500/20 text-red-300",
  error: "bg-red-500/20 text-red-300",
};

function parseScore(scoringResult: string): number | null {
  try {
    const parsed = JSON.parse(scoringResult);
    return typeof parsed.score === "number" ? parsed.score : null;
  } catch {
    return null;
  }
}

function DebugBar({ trace }: { trace: TraceSummary }) {
  const [expanded, setExpanded] = useState(false);

  let parsedScores: Record<string, number> | null = null;
  if (trace.sanitizedScores) {
    try {
      parsedScores = JSON.parse(trace.sanitizedScores);
    } catch {
      // ignore parse errors
    }
  }

  const stanceTransition =
    trace.previousStance && trace.newStance
      ? `${trace.previousStance} → ${trace.newStance}`
      : trace.newStance || "—";

  const decisionColor =
    DECISION_COLORS[trace.decisionType] ?? "bg-white/10 text-zinc-400";

  const score = parseScore(trace.scoringResult);

  return (
    <div className="border-t border-border mt-2 pt-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full flex-wrap items-center gap-2 text-left font-mono text-[0.65rem] text-zinc-400 hover:text-zinc-300 transition-colors"
      >
        <span className="rounded bg-white/10 px-1.5 py-0.5 font-semibold text-zinc-300">
          {stanceTransition}
        </span>
        <span className={`rounded px-1.5 py-0.5 ${decisionColor}`}>
          {trace.decisionType}
        </span>
        {score !== null && (
          <span className="text-zinc-400 font-semibold">{score}</span>
        )}
        {trace.item && (
          <span className="text-zinc-500">{trace.item}{trace.estimatedPrice ? ` $${trace.estimatedPrice.toLocaleString()}` : ""}</span>
        )}
        <span className="text-zinc-500">
          {trace.tokenUsage.totalTokens} tok · {trace.durationMs}ms
        </span>
        <span className="ml-auto text-zinc-600">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && parsedScores && (
        <div className="mt-2 space-y-0.5 font-mono text-[0.6rem] text-zinc-500">
          {Object.entries(parsedScores).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span>{key}</span>
              <span className="text-zinc-400">{value}</span>
            </div>
          ))}
        </div>
      )}

      {expanded && !parsedScores && trace.sanitizedScores && (
        <pre className="mt-2 font-mono text-[0.6rem] text-zinc-500 whitespace-pre-wrap">
          {trace.sanitizedScores}
        </pre>
      )}
    </div>
  );
}

export function MessageBubble({ message, trace }: MessageBubbleProps) {
  const isHank = message.role === "hank";

  if (isHank) {
    return (
      <div className="animate-message-in flex justify-start mb-6">
        <div className="max-w-[85%]">
          <div className="font-mono text-[0.7rem] font-bold uppercase tracking-wide text-accent mb-1">
            Hank
          </div>
          <div className="break-words rounded-2xl rounded-bl-[4px] border border-border bg-hank-bubble px-4 py-3 text-[0.95rem] leading-[1.5] text-hank-text shadow">
            {message.content}
            {trace && <DebugBar trace={trace} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-message-in flex justify-end mb-6">
      <div className="max-w-[85%]">
        <div className="break-words rounded-2xl rounded-br-[4px] bg-user-bubble px-4 py-3 text-[0.95rem] leading-[1.5] text-user-text">
          {message.content}
        </div>
      </div>
    </div>
  );
}

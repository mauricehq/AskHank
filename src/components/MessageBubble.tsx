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

// Fields to skip in assessment display (shown elsewhere or internal)
const ASSESSMENT_SKIP = new Set(["item"]);

// Render assessment enum values with color hints
const ASSESSMENT_HIGHLIGHTS: Record<string, Record<string, string>> = {
  intent: { want: "text-red-400", need: "text-green-400", replace: "text-green-400", upgrade: "text-blue-400", gift: "text-yellow-400" },
  current_solution: { broken: "text-green-400", failing: "text-green-400", outdated: "text-yellow-400", working: "text-red-400", none: "text-green-400" },
  urgency: { immediate: "text-green-400", soon: "text-yellow-400", none: "text-red-400" },
  beneficiary: { dependent: "text-green-400", shared: "text-blue-400", self: "text-zinc-400", gift_discretionary: "text-yellow-400" },
  price_positioning: { budget: "text-green-400", standard: "text-zinc-400", premium: "text-amber-400", luxury: "text-red-400" },
};

function AssessmentValue({ field, value }: { field: string; value: unknown }) {
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-zinc-600">none</span>;
    return <span className="text-yellow-400">{value.join(", ")}</span>;
  }
  if (value === null || value === "unknown") return <span className="text-zinc-600">{String(value)}</span>;
  const color = ASSESSMENT_HIGHLIGHTS[field]?.[String(value)];
  return <span className={color ?? "text-zinc-400"}>{String(value)}</span>;
}

function DebugBar({ trace }: { trace: TraceSummary }) {
  const [expanded, setExpanded] = useState(false);

  let assessment: Record<string, unknown> | null = null;
  let parsedScores: Record<string, number> | null = null;
  if (trace.rawScores) {
    try {
      const raw = JSON.parse(trace.rawScores);
      if (typeof raw === "object" && raw !== null && raw.intent) assessment = raw;
    } catch { /* ignore */ }
  }
  if (trace.sanitizedScores) {
    try {
      parsedScores = JSON.parse(trace.sanitizedScores);
    } catch { /* ignore */ }
  }

  const item = assessment?.item;
  const itemLabel = typeof item === "string" && item !== "unknown" ? item : null;

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
        {itemLabel && (
          <span className="text-zinc-500">{itemLabel}{trace.estimatedPrice ? ` $${trace.estimatedPrice.toLocaleString()}` : ""}</span>
        )}
        <span className="text-zinc-500">
          {trace.tokenUsage.totalTokens} tok · {trace.durationMs}ms
        </span>
        <span className="ml-auto text-zinc-600">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && assessment && (
        <div className="mt-2 space-y-0.5 font-mono text-[0.6rem] text-zinc-500">
          <div className="text-[0.55rem] font-semibold uppercase tracking-wider text-zinc-600 mb-1">Assessment</div>
          {Object.entries(assessment)
            .filter(([key]) => !ASSESSMENT_SKIP.has(key))
            .map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4">
                <span className="shrink-0">{key}</span>
                <AssessmentValue field={key} value={value} />
              </div>
            ))}
        </div>
      )}

      {expanded && parsedScores && (
        <div className="mt-2 space-y-0.5 font-mono text-[0.6rem] text-zinc-500">
          <div className="text-[0.55rem] font-semibold uppercase tracking-wider text-zinc-600 mb-1">Mapped Scores</div>
          {Object.entries(parsedScores).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span>{key}</span>
              <span className="text-zinc-400">{value}</span>
            </div>
          ))}
        </div>
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

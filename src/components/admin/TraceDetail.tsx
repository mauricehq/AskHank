"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ChevronDown, ChevronRight } from "lucide-react";

function tryParseJson(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-border">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-secondary hover:text-text"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {title}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="max-h-[300px] overflow-auto rounded-lg bg-bg-surface p-3 text-xs text-text font-mono whitespace-pre-wrap break-words">
      {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
    </pre>
  );
}

interface TraceDetailProps {
  traceId: Id<"llmTraces">;
}

export function TraceDetail({ traceId }: TraceDetailProps) {
  const trace = useQuery(api.llmTraces.getFullTrace, { traceId });

  if (trace === undefined) {
    return (
      <div className="px-3 py-2 text-xs text-text-secondary">
        Loading trace...
      </div>
    );
  }

  if (trace === null) {
    return (
      <div className="px-3 py-2 text-xs text-denied">Trace not found.</div>
    );
  }

  const rawScores = tryParseJson(trace.rawScores);
  const sanitizedScores = tryParseJson(trace.sanitizedScores);
  const scoringResult = tryParseJson(trace.scoringResult);
  const parsedResponse = tryParseJson(trace.parsedResponse);
  const messagesArray = tryParseJson(trace.messagesArray);
  const toolArguments = trace.toolArguments ? tryParseJson(trace.toolArguments) : null;
  const toolResult = trace.toolResult ? tryParseJson(trace.toolResult) : null;
  const toolCalled = trace.toolCalled ?? null;

  return (
    <div className="rounded-lg border border-border bg-bg-card overflow-hidden">
      {/* Model Config */}
      <CollapsibleSection title="Model Config" defaultOpen>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-text-secondary">Model: </span>
            <span className="text-text font-medium">{trace.modelId}</span>
          </div>
          <div>
            <span className="text-text-secondary">Temp: </span>
            <span className="text-text font-medium">{trace.temperature}</span>
          </div>
          <div>
            <span className="text-text-secondary">Max tokens: </span>
            <span className="text-text font-medium">{trace.maxTokens}</span>
          </div>
        </div>
      </CollapsibleSection>

      {/* Tool Call */}
      {toolCalled !== null && (
        <CollapsibleSection title="Tool Call" defaultOpen>
          <div className="space-y-2">
            <div className="text-xs">
              <span className="text-text-secondary">Type: </span>
              <span className="text-text font-medium">
                {toolCalled ? "Scoring turn" : "Casual turn (no tool call)"}
              </span>
            </div>
            {toolCalled && toolArguments != null ? (
              <div>
                <div className="text-[10px] font-semibold uppercase text-text-secondary mb-1">
                  Tool Arguments (LLM Assessment)
                </div>
                <JsonBlock data={toolArguments} />
              </div>
            ) : null}
            {toolCalled && toolResult != null ? (
              <div>
                <div className="text-[10px] font-semibold uppercase text-text-secondary mb-1">
                  Tool Result (Stance Returned)
                </div>
                <JsonBlock data={toolResult} />
              </div>
            ) : null}
          </div>
        </CollapsibleSection>
      )}

      {/* Scoring */}
      <CollapsibleSection title="Scoring" defaultOpen>
        {toolCalled === false ? (
          <div className="text-xs text-text-secondary py-2">
            No scoring (casual turn)
          </div>
        ) : (
        <div className="space-y-2">
          <div>
            <div className="text-[10px] font-semibold uppercase text-text-secondary mb-1">
              Turn Assessment
            </div>
            <JsonBlock data={rawScores} />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase text-text-secondary mb-1">
              Scoring Result
            </div>
            <JsonBlock data={scoringResult} />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase text-text-secondary mb-1">
              Persisted Context
            </div>
            <JsonBlock data={sanitizedScores} />
          </div>
        </div>
        )}
      </CollapsibleSection>

      {/* System Prompt */}
      <CollapsibleSection title="Call 1 — System Prompt">
        <pre className="max-h-[300px] overflow-auto rounded-lg bg-bg-surface p-3 text-xs text-text font-mono whitespace-pre-wrap break-words">
          {trace.systemPrompt}
        </pre>
      </CollapsibleSection>

      {/* Call 2 System Prompt (shown when it differs from Call 1) */}
      {trace.call2SystemPrompt && (
        <CollapsibleSection title="Call 2 — System Prompt">
          <pre className="max-h-[300px] overflow-auto rounded-lg bg-bg-surface p-3 text-xs text-text font-mono whitespace-pre-wrap break-words">
            {trace.call2SystemPrompt}
          </pre>
        </CollapsibleSection>
      )}

      {/* Call 3 — Verdict Summary (only on closing turns) */}
      {trace.call3RawResponse && (
        <CollapsibleSection title="Call 3 — Verdict Summary" defaultOpen>
          {trace.call3SystemPrompt && (
            <div className="mb-2">
              <div className="text-[10px] font-semibold uppercase text-text-secondary mb-1">
                System Prompt
              </div>
              <pre className="max-h-[200px] overflow-auto rounded-lg bg-bg-surface p-3 text-xs text-text font-mono whitespace-pre-wrap break-words">
                {trace.call3SystemPrompt}
              </pre>
            </div>
          )}
          <div>
            <div className="text-[10px] font-semibold uppercase text-text-secondary mb-1">
              Raw Response
            </div>
            <pre className="max-h-[200px] overflow-auto rounded-lg bg-bg-surface p-3 text-xs text-text font-mono whitespace-pre-wrap break-words">
              {trace.call3RawResponse}
            </pre>
          </div>
        </CollapsibleSection>
      )}

      {/* Messages Array */}
      <CollapsibleSection title="Messages Array">
        <JsonBlock data={messagesArray} />
      </CollapsibleSection>

      {/* Raw LLM Response */}
      <CollapsibleSection title="Raw LLM Response">
        <pre className="max-h-[300px] overflow-auto rounded-lg bg-bg-surface p-3 text-xs text-text font-mono whitespace-pre-wrap break-words">
          {trace.rawResponse}
        </pre>
      </CollapsibleSection>

      {/* Parsed Response */}
      <CollapsibleSection title="Parsed Response">
        <JsonBlock data={parsedResponse} />
      </CollapsibleSection>

      {/* Timing */}
      <CollapsibleSection title="Timing" defaultOpen>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div>
            <span className="text-text-secondary">Duration: </span>
            <span className="text-text font-medium">{trace.durationMs}ms</span>
          </div>
          <div>
            <span className="text-text-secondary">Prompt: </span>
            <span className="text-text font-medium">
              {trace.tokenUsage.promptTokens}
            </span>
          </div>
          <div>
            <span className="text-text-secondary">Completion: </span>
            <span className="text-text font-medium">
              {trace.tokenUsage.completionTokens}
            </span>
          </div>
          <div>
            <span className="text-text-secondary">Total: </span>
            <span className="text-text font-medium">
              {trace.tokenUsage.totalTokens}
            </span>
          </div>
        </div>
      </CollapsibleSection>

      {/* Error (if present) */}
      {trace.error && (
        <CollapsibleSection title="Error" defaultOpen>
          <div className="rounded-lg bg-denied/10 p-3 text-xs text-denied font-mono">
            {trace.error}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface ReplayCut {
  messages: { role: "user" | "hank"; content: string }[];
  item: string;
  estimatedPrice?: number;
  category?: string;
  verdict: "approved" | "denied";
  verdictSummary?: string;
}

type PlaybackState =
  | { phase: "idle" }
  | { phase: "message"; index: number }
  | { phase: "typing"; index: number }
  | { phase: "verdict" }
  | { phase: "done" };

interface ReplayScreenProps {
  cut: ReplayCut;
}

export function ReplayScreen({ cut }: ReplayScreenProps) {
  const [state, setState] = useState<PlaybackState>({ phase: "idle" });
  const [visibleCount, setVisibleCount] = useState(0);
  const [showTyping, setShowTyping] = useState(false);
  const [showVerdict, setShowVerdict] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const start = useCallback(() => {
    setVisibleCount(0);
    setShowTyping(false);
    setShowVerdict(false);
    // Reset to idle, then the mount effect pattern will be handled by
    // the state machine transition on next render
    setState({ phase: "message", index: 0 });
  }, []);

  // Start playback on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setState({ phase: "message", index: 0 });
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // State machine
  useEffect(() => {
    if (state.phase === "idle") return;

    if (state.phase === "message") {
      const { index } = state;
      if (index >= cut.messages.length) {
        // All messages shown, show verdict
        setState({ phase: "verdict" });
        return;
      }
      // Show this message
      setShowTyping(false);
      setVisibleCount(index + 1);
      const msg = cut.messages[index];
      const pauseMs = Math.max(
        msg.role === "hank" ? 800 : 600,
        msg.content.length * (msg.role === "hank" ? 35 : 30)
      );
      const nextIndex = index + 1;
      const nextMsg = cut.messages[nextIndex];

      const timer = setTimeout(() => {
        if (nextMsg && nextMsg.role === "hank") {
          // Show typing before next Hank message
          setState({ phase: "typing", index: nextIndex });
        } else if (nextIndex < cut.messages.length) {
          setState({ phase: "message", index: nextIndex });
        } else {
          setState({ phase: "verdict" });
        }
      }, pauseMs);
      return () => clearTimeout(timer);
    }

    if (state.phase === "typing") {
      setShowTyping(true);
      const timer = setTimeout(() => {
        setShowTyping(false);
        setState({ phase: "message", index: state.index });
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (state.phase === "verdict") {
      let doneTimer: ReturnType<typeof setTimeout>;
      const timer = setTimeout(() => {
        setShowVerdict(true);
        doneTimer = setTimeout(() => setState({ phase: "done" }), 3000);
      }, 300);
      return () => {
        clearTimeout(timer);
        clearTimeout(doneTimer);
      };
    }
  }, [state, cut.messages]);

  // Auto-scroll to bottom when new messages appear or verdict shows
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleCount, showVerdict]);

  const isDenied = cut.verdict === "denied";
  const priceLabel = cut.estimatedPrice
    ? ` · $${cut.estimatedPrice.toLocaleString()}`
    : "";

  return (
    <div className="flex h-dvh flex-col items-center bg-bg font-sans">
      <div className="flex w-full max-w-[420px] flex-1 flex-col px-4 py-6">
        {/* Item header */}
        <div className="mb-4 text-center">
          <div className="text-xs font-medium uppercase tracking-wider text-text-secondary">
            {cut.item}{priceLabel}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto">
          {cut.messages.slice(0, visibleCount).map((msg, i) => {
            const isHank = msg.role === "hank";
            return (
              <div
                key={i}
                className="animate-message-in"

              >
                {isHank ? (
                  <div className="flex justify-start">
                    <div className="max-w-[85%]">
                      <div className="font-mono text-[0.7rem] font-bold uppercase tracking-wide text-accent mb-1">
                        Hank
                      </div>
                      <div className="break-words rounded-2xl rounded-bl-[4px] border border-border bg-hank-bubble px-4 py-3 text-[0.95rem] leading-[1.5] text-hank-text shadow">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <div className="max-w-[85%]">
                      <div className="break-words rounded-2xl rounded-br-[4px] bg-user-bubble px-4 py-3 text-[0.95rem] leading-[1.5] text-user-text">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing indicator */}
          {showTyping && (
            <div className="animate-message-in flex justify-start">
              <div className="max-w-[85%]">
                <div className="font-mono text-[0.7rem] font-bold uppercase tracking-wide text-accent mb-1">
                  Hank
                </div>
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-[4px] border border-border bg-hank-bubble px-4 py-3 shadow w-fit">
                  <span className="typing-dot h-2 w-2 rounded-full bg-text-secondary" />
                  <span className="typing-dot h-2 w-2 rounded-full bg-text-secondary [animation-delay:0.2s]" />
                  <span className="typing-dot h-2 w-2 rounded-full bg-text-secondary [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}

          {/* Verdict card */}
          {showVerdict && (
            <div
              className={`animate-verdict-in text-center p-5 rounded-xl mt-2 border-[1.5px] ${
                isDenied
                  ? "border-denied bg-[rgba(198,90,46,0.08)]"
                  : "border-approved bg-[rgba(90,138,94,0.08)]"
              }`}
            >
              <div
                className={`text-[0.8rem] font-bold uppercase tracking-[0.12em] mb-2 ${
                  isDenied ? "text-denied" : "text-approved"
                }`}
              >
                CASE CLOSED — {isDenied ? "DENIED" : "APPROVED"}: {cut.item}{cut.estimatedPrice ? ` ($${cut.estimatedPrice.toLocaleString()})` : ""}
              </div>
              {cut.verdictSummary && (
                <p className="text-[0.9rem] italic text-text-secondary">
                  {cut.verdictSummary}
                </p>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom: watermark + replay */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-[0.65rem] text-text-secondary/50 tracking-wider">
            askhank.app
          </div>
          {state.phase === "done" && (
            <button
              onClick={start}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text hover:bg-bg-surface transition-colors"
            >
              Replay
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { VerdictCard } from "./VerdictCard";
import { ScrollToBottom } from "./ScrollToBottom";
import { useConversation } from "@/hooks/useConversation";
import { useUserAccess } from "@/hooks/useUserAccess";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useAppLayout } from "./AppLayoutContext";
import type { Id } from "../../convex/_generated/dataModel";
import type { TraceSummary } from "@/types/chat";

interface ChatScreenProps {
  conversationId?: Id<"conversations"> | null;
  onConversationCreated?: (id: Id<"conversations">) => void;
  onNewConversation: () => void;
}

export function ChatScreen({ conversationId: externalId, onConversationCreated, onNewConversation }: ChatScreenProps) {
  const { openCreditsModal } = useAppLayout();
  const { messages, isThinking, isError, send, reset, verdict, conversationId: hookConversationId, loadConversation, item, estimatedPrice, category, verdictSummary, score, outOfCredits, thinkingSince } = useConversation();
  const { isAdmin } = useUserAccess();
  const [showDebug, setShowDebug] = useLocalStorage("hank-debug-bar", true);

  const activeConversationId = hookConversationId ?? externalId;
  const traceSummaries = useQuery(
    api.llmTraces.getTraceSummariesForConversation,
    isAdmin && activeConversationId ? { conversationId: activeConversationId } : "skip"
  );

  const traceByMessageId = useMemo(() => {
    const map = new Map<string, TraceSummary>();
    if (traceSummaries) {
      for (const t of traceSummaries) {
        if (t.messageId) map.set(t.messageId, t);
      }
    }
    return map;
  }, [traceSummaries]);

  // Sync external ID into the hook
  useEffect(() => {
    if (externalId) {
      loadConversation(externalId);
    } else {
      reset();
    }
  }, [externalId, loadConversation, reset]);

  // Sync newly-created conversation ID back to parent.
  // Use a ref for externalId so this effect only fires when hookConversationId
  // changes — not when externalId changes (which would cause a ping-pong loop
  // between the two effects when switching conversations).
  const externalIdRef: RefObject<Id<"conversations"> | null | undefined> = useRef(externalId);
  externalIdRef.current = externalId;
  useEffect(() => {
    if (hookConversationId && hookConversationId !== externalIdRef.current) {
      onConversationCreated?.(hookConversationId);
    }
  }, [hookConversationId, onConversationCreated]);
  const [showSlowWarning, setShowSlowWarning] = useState(false);

  useEffect(() => {
    if (!isThinking || !thinkingSince) {
      setShowSlowWarning(false);
      return;
    }
    const elapsed = Date.now() - thinkingSince;
    const remaining = 15_000 - elapsed;
    if (remaining <= 0) {
      setShowSlowWarning(true);
      return;
    }
    const timer = setTimeout(() => setShowSlowWarning(true), remaining);
    return () => clearTimeout(timer);
  }, [isThinking, thinkingSince]);

  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollToBottom(distanceFromBottom > 200);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking, isError]);

  const handleSend = async (text: string) => {
    try {
      await send(text);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleNewConversation = () => {
    reset();
    onNewConversation();
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="relative flex-1">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto"
        >
          <div className="mx-auto max-w-[720px] px-4 py-4 md:px-6 md:py-6">
            {isAdmin && messages.length > 0 && (
              <div className="flex justify-end mb-2">
                <button
                  type="button"
                  onClick={() => setShowDebug((prev) => !prev)}
                  className="font-mono text-[0.6rem] text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  {showDebug ? "hide debug" : "show debug"}
                </button>
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} trace={showDebug ? traceByMessageId.get(msg.id) : undefined} />
            ))}
            {isThinking && <TypingIndicator />}
            {isThinking && showSlowWarning && (
              <div className="my-2 text-center text-xs text-text-secondary animate-fade-in">
                Taking longer than expected...
              </div>
            )}
            {isError && !outOfCredits && (
              <div className="my-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-300">
                Something went wrong. Send another message to retry.
              </div>
            )}
            {outOfCredits && (
              <div className="my-4 rounded-2xl border border-accent/30 bg-accent/5 px-5 py-4 text-center">
                <p className="text-sm font-semibold text-text">
                  You&apos;re out of credits
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  Buy more to keep talking to Hank.
                </p>
                <button
                  onClick={openCreditsModal}
                  className="mt-3 rounded-[10px] bg-accent px-5 py-2 text-sm font-semibold text-user-text hover:bg-accent-hover active:scale-[0.97]"
                >
                  Get credits
                </button>
              </div>
            )}
            {verdict && (
              <VerdictCard verdict={verdict} item={item} estimatedPrice={estimatedPrice} category={category} verdictSummary={verdictSummary} score={score} conversationId={activeConversationId ?? undefined} onNewConversation={handleNewConversation} />
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        <ScrollToBottom visible={showScrollToBottom} onClick={scrollToBottom} />
      </div>
      {!verdict && (
        <ChatInput
          onSend={handleSend}
          hasMessages={messages.length > 0}
          disabled={isThinking}
          outOfCredits={outOfCredits}
        />
      )}
    </div>
  );
}

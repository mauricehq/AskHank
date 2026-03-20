"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useQuery } from "convex/react";
import Image from "next/image";
import { api } from "../../convex/_generated/api";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { DecisionCard } from "./DecisionCard";
import { DecisionBar } from "./DecisionBar";
import { ScrollToBottom } from "./ScrollToBottom";
import { AnimatePresence, motion } from "framer-motion";
import { useConversation } from "@/hooks/useConversation";
import { useUserAccess } from "@/hooks/useUserAccess";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useAppLayout } from "./AppLayoutContext";
import { getGreeting } from "@/lib/greetings";
import { FollowUpNudge } from "./FollowUpNudge";
import { cascade } from "@/lib/motion";
import type { Id } from "../../convex/_generated/dataModel";
import type { TraceSummary } from "@/types/chat";

interface ChatScreenProps {
  conversationId?: Id<"conversations"> | null;
  onConversationCreated?: (id: Id<"conversations">) => void;
  onNewConversation: () => void;
}

export function ChatScreen({ conversationId: externalId, onConversationCreated, onNewConversation }: ChatScreenProps) {
  const { openCreditsModal, setActiveConversationId } = useAppLayout();
  const {
    messages, isThinking, isError, isResolved, isPaused,
    send, resolve, reset, decision, reactionText, hankScore,
    conversationId: hookConversationId, loadConversation,
    item, estimatedPrice, category, outOfCredits, thinkingSince,
  } = useConversation();
  const { isAdmin } = useUserAccess();
  const currentUser = useQuery(api.users.currentUser);
  const [showDebug, setShowDebug] = useLocalStorage("hank-debug-bar", true);

  const activeConversationId = hookConversationId ?? externalId;

  // Sync active conversation ID to layout context for Stripe return URLs
  useEffect(() => {
    setActiveConversationId(activeConversationId ?? null);
    return () => setActiveConversationId(null);
  }, [activeConversationId, setActiveConversationId]);

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
    await send(text);
  };

  const handleNewConversation = () => {
    reset();
    onNewConversation();
  };

  const firstName = currentUser?.displayName?.split(" ")[0];
  const [greeting, setGreeting] = useState("");
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    setGreeting(getGreeting(firstName));
  }, [firstName]);

  const isGreeting = messages.length === 0 && !isThinking && !externalId;

  // Show DecisionBar when active/paused and at least one exchange happened
  const showDecisionBar = !isResolved && !isThinking && messages.length >= 2 && (
    !isPaused // show when active
    // don't show when paused — user already chose "need to think"
  );

  return (
    <AnimatePresence mode="wait">
      {isGreeting ? (
        <motion.div
          key="greeting"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="flex flex-1 flex-col items-center justify-center px-6"
        >
          <Image
            src="/AskHankIcon.svg"
            alt="AskHank"
            width={64}
            height={64}
            className="mb-5 animate-greeting-icon"
          />
          <motion.h1
            {...(reducedMotion ? {} : cascade(1))}
            className="text-lg font-semibold text-text"
          >
            {greeting}
          </motion.h1>
          <motion.div
            {...(reducedMotion ? {} : cascade(2))}
            className="mt-5 w-full max-w-[600px] flex flex-col items-center"
          >
            <FollowUpNudge />
            <ChatInput
              onSend={handleSend}
              hasMessages={false}
              disabled={false}
              outOfCredits={outOfCredits}
              centered
            />
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="chat"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex flex-1 flex-col min-h-0"
        >
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
                {isResolved && decision && (
                  <DecisionCard
                    decision={decision}
                    reactionText={reactionText}
                    hankScore={hankScore}
                    item={item}
                    estimatedPrice={estimatedPrice}
                    category={category}
                    conversationId={activeConversationId ?? undefined}
                    onNewConversation={handleNewConversation}
                  />
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
            <ScrollToBottom visible={showScrollToBottom} onClick={scrollToBottom} />
          </div>
          {showDecisionBar && (
            <DecisionBar onResolve={resolve} disabled={isError} />
          )}
          {!isResolved && (
            <ChatInput
              onSend={handleSend}
              hasMessages={messages.length > 0}
              disabled={isThinking}
              outOfCredits={outOfCredits}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

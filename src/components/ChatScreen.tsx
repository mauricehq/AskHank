"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { VerdictCard } from "./VerdictCard";
import { ScrollToBottom } from "./ScrollToBottom";
import { useConversation } from "@/hooks/useConversation";
import { useUserAccess } from "@/hooks/useUserAccess";
import type { Id } from "../../convex/_generated/dataModel";
import type { TraceSummary } from "@/types/chat";

interface ChatScreenProps {
  conversationId?: Id<"conversations"> | null;
  onConversationCreated?: (id: Id<"conversations">) => void;
  onNewConversation: () => void;
}

export function ChatScreen({ conversationId: externalId, onConversationCreated, onNewConversation }: ChatScreenProps) {
  const { messages, isThinking, isError, send, reset, verdict, conversationId: hookConversationId, loadConversation } = useConversation();
  const { isAdmin } = useUserAccess();

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

  // Sync newly-created conversation ID back to parent
  useEffect(() => {
    if (hookConversationId && hookConversationId !== externalId) {
      onConversationCreated?.(hookConversationId);
    }
  }, [hookConversationId, externalId, onConversationCreated]);
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
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} trace={traceByMessageId.get(msg.id)} />
            ))}
            {isThinking && <TypingIndicator />}
            {isError && (
              <div className="my-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-300">
                Something went wrong. Send another message to retry.
              </div>
            )}
            {verdict && (
              <VerdictCard verdict={verdict} onNewConversation={handleNewConversation} />
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
        />
      )}
    </div>
  );
}

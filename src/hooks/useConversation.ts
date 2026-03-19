"use client";

import { useState, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MESSAGE_COST } from "../../convex/lib/credits";
import type { Id } from "../../convex/_generated/dataModel";
import type { Message, DecisionType } from "@/types/chat";

export function useConversation() {
  const [conversationId, setConversationId] = useState<Id<"conversations"> | null>(null);
  const credits = useQuery(api.credits.getBalance);
  const outOfCredits = credits !== undefined && credits.balance < MESSAGE_COST;

  const conversation = useQuery(
    api.conversations.getConversation,
    conversationId ? { conversationId } : "skip"
  );

  const rawMessages = useQuery(
    api.conversations.getMessages,
    conversationId ? { conversationId } : "skip"
  );

  const sendMutation = useMutation(api.conversations.send);
  const resolveMutation = useMutation(api.conversations.resolve);

  const messages: Message[] = useMemo(
    () =>
      (rawMessages ?? []).map((m) => ({
        id: m._id,
        role: m.role,
        content: m.content,
      })),
    [rawMessages]
  );

  const isThinking = conversation?.status === "thinking";
  const isError = conversation?.status === "error";
  const isResolved = conversation?.status === "resolved";
  const isPaused = conversation?.status === "paused";

  const decision: DecisionType | null = conversation?.decision ?? null;
  const reactionText: string | null = conversation?.reactionText ?? null;
  const hankScore: number | null = conversation?.hankScore ?? null;

  const send = useCallback(
    async (content: string) => {
      if (conversation?.status === "resolved") return;
      const id = await sendMutation({
        conversationId: conversationId ?? undefined,
        content,
      });
      if (!conversationId) {
        setConversationId(id);
      }
    },
    [sendMutation, conversationId, conversation?.status]
  );

  const resolve = useCallback(
    async (dec: DecisionType) => {
      if (!conversationId) return;
      try {
        await resolveMutation({ conversationId, decision: dec });
      } catch (error) {
        console.error("Failed to resolve conversation:", error);
      }
    },
    [resolveMutation, conversationId]
  );

  const reset = useCallback(() => {
    setConversationId(null);
  }, []);

  const loadConversation = useCallback((id: Id<"conversations">) => {
    setConversationId(id);
  }, []);

  return {
    messages,
    isThinking,
    isError,
    isResolved,
    isPaused,
    send,
    resolve,
    reset,
    decision,
    reactionText,
    hankScore,
    conversationId,
    loadConversation,
    item: conversation?.item,
    estimatedPrice: conversation?.estimatedPrice,
    category: conversation?.category,
    outOfCredits,
    thinkingSince: conversation?.thinkingSince ?? null,
  };
}

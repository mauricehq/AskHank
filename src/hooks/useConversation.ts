"use client";

import { useState, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Message, Verdict, VerdictType } from "@/types/chat";

export function useConversation() {
  const [conversationId, setConversationId] = useState<Id<"conversations"> | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(false);

  const conversation = useQuery(
    api.conversations.getConversation,
    conversationId ? { conversationId } : "skip"
  );

  const rawMessages = useQuery(
    api.conversations.getMessages,
    conversationId ? { conversationId } : "skip"
  );

  const sendMutation = useMutation(api.conversations.send);

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

  const verdict: Verdict | null = useMemo(() => {
    if (!conversation?.verdict || conversation?.status !== "closed") return null;
    const hankMessages = messages.filter((m) => m.role === "hank");
    const lastHankMsg = hankMessages[hankMessages.length - 1];
    return {
      type: conversation.verdict as VerdictType,
      quote: lastHankMsg?.content ?? "",
    };
  }, [conversation?.verdict, conversation?.status, messages]);

  const send = useCallback(
    async (content: string) => {
      if (conversation?.status === "closed") return;
      try {
        setOutOfCredits(false);
        const id = await sendMutation({
          conversationId: conversationId ?? undefined,
          content,
        });
        if (!conversationId) {
          setConversationId(id);
        }
      } catch (error: any) {
        const msg = String(error?.message ?? error?.data ?? "");
        if (msg.includes("INSUFFICIENT_CREDITS")) {
          setOutOfCredits(true);
        } else {
          throw error;
        }
      }
    },
    [sendMutation, conversationId, conversation?.status]
  );

  const reset = useCallback(() => {
    setConversationId(null);
    setOutOfCredits(false);
  }, []);

  const loadConversation = useCallback((id: Id<"conversations">) => {
    setConversationId(id);
  }, []);

  return { messages, isThinking, isError, send, reset, verdict, conversationId, loadConversation, item: conversation?.item, estimatedPrice: conversation?.estimatedPrice, outOfCredits, thinkingSince: conversation?.thinkingSince ?? null };
}

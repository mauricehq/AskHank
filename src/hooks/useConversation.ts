"use client";

import { useState, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Message } from "@/types/chat";

export function useConversation() {
  const [conversationId, setConversationId] = useState<Id<"conversations"> | null>(null);

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

  const send = useCallback(
    async (content: string) => {
      const id = await sendMutation({
        conversationId: conversationId ?? undefined,
        content,
      });
      if (!conversationId) {
        setConversationId(id);
      }
    },
    [sendMutation, conversationId]
  );

  const reset = useCallback(() => {
    setConversationId(null);
  }, []);

  return { messages, isThinking, isError, send, reset };
}

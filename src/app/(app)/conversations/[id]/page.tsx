"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChatScreen } from "@/components/ChatScreen";
import type { Id } from "../../../../../convex/_generated/dataModel";

// Convex IDs are URL-safe alphanumeric strings
const CONVEX_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.id as string;
  const isValidId = typeof rawId === "string" && CONVEX_ID_PATTERN.test(rawId);

  useEffect(() => {
    if (!isValidId) {
      router.replace("/conversations");
    }
  }, [isValidId, router]);

  if (!isValidId) return null;

  const conversationId = rawId as Id<"conversations">;

  return (
    <ChatScreen
      conversationId={conversationId}
      onConversationCreated={(id: Id<"conversations">) => {
        router.replace(`/conversations/${id}`);
      }}
      onNewConversation={() => {
        router.push("/conversations/new");
      }}
    />
  );
}

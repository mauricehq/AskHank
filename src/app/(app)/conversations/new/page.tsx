"use client";

import { useRouter } from "next/navigation";
import { ChatScreen } from "@/components/ChatScreen";
import type { Id } from "../../../../../convex/_generated/dataModel";

export default function NewConversationPage() {
  const router = useRouter();

  return (
    <ChatScreen
      onConversationCreated={(id: Id<"conversations">) => {
        router.replace(`/conversations/${id}`);
      }}
      onNewConversation={() => {
        router.push("/conversations/new");
      }}
    />
  );
}

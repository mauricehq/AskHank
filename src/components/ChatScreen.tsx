"use client";

import { useEffect, useRef, useState } from "react";
import type { Message } from "@/types/chat";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";

const MOCK_MESSAGES: Message[] = [
  { id: "1", role: "hank", content: "What are you looking at." },
  { id: "2", role: "user", content: "A Breville espresso machine. The Barista Express. $699." },
  { id: "3", role: "hank", content: "You have a coffee maker at home. You just want the aesthetic." },
  { id: "4", role: "user", content: "My old coffee maker broke last week." },
  { id: "5", role: "hank", content: "A broken coffee maker is a $30 problem. A $699 espresso machine is a $699 want. Get a new drip maker." },
];

export function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (text: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] px-4 py-4 md:px-6 md:py-6">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <ChatInput onSend={handleSend} hasMessages={messages.length > 0} />
    </div>
  );
}

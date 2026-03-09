"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { Message, Verdict } from "@/types/chat";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { VerdictCard } from "./VerdictCard";
import { ScrollToBottom } from "./ScrollToBottom";

const MOCK_HANK_RESPONSES = [
  "That sounds like a want, not a need. What's wrong with what you have now.",
  "How many times have you used the last thing you bought like this.",
  "You're describing a problem that costs $30 to fix. Not $500.",
];

const MOCK_VERDICT: Verdict = {
  type: "denied",
  quote: "You came to me with \"I want it\" and you're leaving with \"I want it.\" Nothing changed. $549 saved.",
};

interface ChatScreenProps {
  onNewConversation: () => void;
}

export function ChatScreen({ onNewConversation }: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, [messages, isTyping, verdict]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleSend = (text: string) => {
    if (isTyping) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text,
    };
    const newCount = userMessageCount + 1;
    setMessages((prev) => [...prev, newMessage]);
    setUserMessageCount(newCount);
    setIsTyping(true);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);

      if (newCount >= 3) {
        setVerdict(MOCK_VERDICT);
      } else {
        const hankResponse: Message = {
          id: `msg-${Date.now()}-hank`,
          role: "hank",
          content: MOCK_HANK_RESPONSES[(newCount - 1) % MOCK_HANK_RESPONSES.length],
        };
        setMessages((prev) => [...prev, hankResponse]);
      }
    }, 1500);
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
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <AnimatePresence>
              {isTyping && <TypingIndicator key="typing" />}
            </AnimatePresence>
            {verdict && (
              <VerdictCard verdict={verdict} onNewConversation={onNewConversation} />
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
          disabled={isTyping}
        />
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowUp } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { SectionHeader } from "./SectionHeader";

// ---------------------------------------------------------------------------
// Types & data
// ---------------------------------------------------------------------------
interface Message {
  role: "user" | "hank";
  content: string;
  delay: number;
  typingDuration?: number;
}

interface DemoConversation {
  id: string;
  label: string;
  shortLabel: string;
  price: number;
  verdict: "denied" | "approved";
  verdictQuote: string;
  messages: Message[];
}

const CONVERSATIONS: DemoConversation[] = [
  {
    id: "espresso",
    label: "Espresso Machine",
    shortLabel: "Espresso",
    price: 900,
    verdict: "denied",
    verdictQuote: "That's a Pinterest board with a credit card.",
    messages: [
      {
        role: "user",
        content: "I want to buy a $900 espresso machine.",
        delay: 0,
      },
      {
        role: "hank",
        content:
          "$900 on a machine that'll sit next to the other appliances you swore you'd use daily. What are you making coffee with now?",
        delay: 800,
        typingDuration: 1500,
      },
      {
        role: "user",
        content: "A drip maker. It works fine.",
        delay: 1200,
      },
      {
        role: "hank",
        content:
          "So you have a working coffee maker and you want to spend $900 because... the foam? That's a Pinterest board with a credit card.",
        delay: 800,
        typingDuration: 1800,
      },
      {
        role: "user",
        content: "ok fine I don't need it",
        delay: 1500,
      },
    ],
  },
  {
    id: "pressure-washer",
    label: "Pressure Washer",
    shortLabel: "Washer",
    price: 200,
    verdict: "approved",
    verdictQuote: "You've actually thought this through.",
    messages: [
      {
        role: "user",
        content:
          "Looking at buying a pressure washer to wash my car. Around $200.",
        delay: 0,
      },
      {
        role: "hank",
        content:
          "You already wash your car without one. What's wrong with the hose and bucket method?",
        delay: 800,
        typingDuration: 1200,
      },
      {
        role: "user",
        content:
          "I wash every 2 weeks, Montreal winters destroy the paint. Grit gets stuck like glue.",
        delay: 1200,
      },
      {
        role: "hank",
        content:
          "A pressure washer won't stop winter from happening. How many car washes would $200 buy at the touchless place down the road?",
        delay: 800,
        typingDuration: 1800,
      },
      {
        role: "user",
        content:
          "Around 10, not even a full winter. And I have my own garage so I don't freeze outside.",
        delay: 1500,
      },
      {
        role: "hank",
        content:
          "Alright, fine. Winter in Montreal is a warzone and you've actually thought this through. Just promise me you'll use it more than once a season.",
        delay: 800,
        typingDuration: 2000,
      },
    ],
  },
  {
    id: "candles",
    label: "Scented Candles",
    shortLabel: "Candles",
    price: 45,
    verdict: "denied",
    verdictQuote: "Happiness isn't stored in pumpkin chai wax.",
    messages: [
      {
        role: "user",
        content:
          "I want to buy some scented candles, $45 from this brand I saw on TikTok.",
        delay: 0,
      },
      {
        role: "hank",
        content:
          "TikTok told you to want these. TikTok also told you to want the last thing you barely used. What's different this time?",
        delay: 800,
        typingDuration: 1500,
      },
      {
        role: "user",
        content: "But it makes me happy. Self care is important.",
        delay: 1200,
      },
      {
        role: "hank",
        content:
          "You're confusing self-care with retail therapy. Happiness isn't stored in pumpkin chai wax. You know this.",
        delay: 800,
        typingDuration: 1800,
      },
      {
        role: "user",
        content: "ugh fine whatever",
        delay: 1500,
      },
    ],
  },
  {
    id: "monitor",
    label: "Gaming Monitor",
    shortLabel: "Monitor",
    price: 800,
    verdict: "denied",
    verdictQuote: "You're not upgrading, you're just shopping with extra steps.",
    messages: [
      {
        role: "user",
        content: "I want a new 4K gaming monitor. About $800.",
        delay: 0,
      },
      {
        role: "hank",
        content: "What's your current monitor failing at, exactly?",
        delay: 800,
        typingDuration: 1000,
      },
      {
        role: "user",
        content:
          "It's only 1080p and I play competitive shooters. The clarity difference at 4K is huge.",
        delay: 1200,
      },
      {
        role: "hank",
        content:
          "A 1080p monitor worked fine for years. Now suddenly it's holding you back, right when shiny new 4K screens hit the market. Convenient timing.",
        delay: 800,
        typingDuration: 1800,
      },
      {
        role: "user",
        content:
          "It's 5 years old and has ghosting issues. Games have gotten more demanding too.",
        delay: 1500,
      },
      {
        role: "hank",
        content:
          "Last week it was a $900 espresso machine. Now it's an $800 monitor. You're not upgrading, you're just shopping with extra steps.",
        delay: 800,
        typingDuration: 2000,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Typing indicator (standalone — no Convex)
// ---------------------------------------------------------------------------
function DemoTypingIndicator() {
  return (
    <div className="animate-message-in flex justify-start mb-6">
      <div className="max-w-[85%]">
        <div className="font-mono text-[0.7rem] font-bold uppercase tracking-wide text-accent mb-1">
          Hank
        </div>
        <div className="flex items-center gap-1 rounded-2xl rounded-bl-[4px] border border-border bg-hank-bubble px-4 py-3 shadow w-fit">
          <span className="typing-dot h-2 w-2 rounded-full bg-text-secondary" />
          <span className="typing-dot h-2 w-2 rounded-full bg-text-secondary [animation-delay:0.2s]" />
          <span className="typing-dot h-2 w-2 rounded-full bg-text-secondary [animation-delay:0.4s]" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Verdict card (simplified — no share/new-conversation buttons)
// ---------------------------------------------------------------------------
function DemoVerdict({
  verdict,
  price,
  quote,
}: {
  verdict: "denied" | "approved";
  price: number;
  quote: string;
}) {
  const isDenied = verdict === "denied";
  return (
    <div
      className={`animate-verdict-in text-center p-5 rounded-xl mt-2 mb-6 border-[1.5px] ${
        isDenied
          ? "border-denied bg-[rgba(198,90,46,0.08)]"
          : "border-approved bg-[rgba(90,138,94,0.08)]"
      }`}
    >
      <div
        className={`text-[0.8rem] font-bold uppercase tracking-[0.12em] mb-2 ${
          isDenied ? "text-denied" : "text-approved"
        }`}
      >
        CASE CLOSED &mdash; {isDenied ? "DENIED" : "APPROVED"} ($
        {price.toLocaleString()})
      </div>
      <p className="text-[0.9rem] italic text-text-secondary">
        &ldquo;{quote}&rdquo;
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChatDemo — auto-playing chat showcase
// ---------------------------------------------------------------------------
export function ChatDemo() {
  const { ref, inView } = useInView(0.15);

  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationDone, setConversationDone] = useState(false);
  const [showVerdict, setShowVerdict] = useState(false);
  const [autoCycleEnabled, setAutoCycleEnabled] = useState(true);
  const [showProgress, setShowProgress] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentConversation = CONVERSATIONS[activeIndex];

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleCount, isTyping, showVerdict]);

  // Play through current conversation's messages
  useEffect(() => {
    if (!inView) return;

    setVisibleCount(0);
    setIsTyping(false);
    setConversationDone(false);
    setShowVerdict(false);
    setShowProgress(false);

    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    timeoutsRef.current = timeouts;

    function schedule(fn: () => void, ms: number) {
      const id = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
      timeouts.push(id);
      return id;
    }

    const messages = CONVERSATIONS[activeIndex].messages;
    let elapsed = 0;

    messages.forEach((msg, i) => {
      elapsed += msg.delay;

      if (msg.role === "hank" && msg.typingDuration) {
        const typingStart = elapsed;
        schedule(() => setIsTyping(true), typingStart);

        elapsed += msg.typingDuration;
        const revealAt = elapsed;
        schedule(() => {
          setIsTyping(false);
          setVisibleCount(i + 1);
        }, revealAt);
      } else {
        const revealAt = elapsed;
        schedule(() => setVisibleCount(i + 1), revealAt);
      }
    });

    // Show verdict after last message
    schedule(() => setShowVerdict(true), elapsed + 1000);
    schedule(() => setConversationDone(true), elapsed + 1200);

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [inView, activeIndex]);

  // Auto-advance after conversation finishes
  useEffect(() => {
    if (!conversationDone || !autoCycleEnabled) return;

    setShowProgress(true);

    const id = setTimeout(() => {
      setShowProgress(false);
      setActiveIndex((prev) => (prev + 1) % CONVERSATIONS.length);
    }, 4000);

    return () => {
      clearTimeout(id);
      setShowProgress(false);
    };
  }, [conversationDone, autoCycleEnabled]);

  function handleTabClick(index: number) {
    if (index === activeIndex) return;
    setAutoCycleEnabled(false);
    timeoutsRef.current.forEach(clearTimeout);
    setActiveIndex(index);
  }

  const visibleMessages = currentConversation.messages.slice(0, visibleCount);

  return (
    <div className="py-20 md:py-32 px-4">
      <SectionHeader label="What Hank Sounds Like" />

      {/* Tab bar */}
      <div role="tablist" className="flex justify-center gap-3 sm:gap-6 mb-8 md:mb-12 px-2 flex-wrap">
        {CONVERSATIONS.map((conv, i) => (
          <button
            key={conv.id}
            role="tab"
            aria-selected={i === activeIndex}
            onClick={() => handleTabClick(i)}
            className={`relative font-mono text-[0.65rem] sm:text-xs uppercase tracking-widest pb-2 whitespace-nowrap transition-colors duration-200 ${
              i === activeIndex
                ? "text-text"
                : "text-text-secondary hover:text-text"
            }`}
          >
            <span className="sm:hidden">{conv.shortLabel}</span>
            <span className="hidden sm:inline">
              {conv.label} &mdash; ${conv.price}
            </span>

            {/* Dim underline for active tab */}
            <div
              className={`absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-200 ${
                i === activeIndex ? "bg-border" : "bg-transparent"
              }`}
            />

            {/* Progress bar fill during auto-advance pause */}
            {i === activeIndex && autoCycleEnabled && (
              <div
                className="absolute bottom-0 left-0 h-0.5 bg-accent rounded-full"
                style={{
                  width: showProgress ? "100%" : "0%",
                  transition: showProgress ? "width 4s linear" : "none",
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Chat window */}
      <div ref={ref} className="w-full max-w-2xl mx-auto">
        <div className="bg-bg-surface rounded-xl border border-border overflow-hidden flex flex-col select-none">
          {/* Messages area */}
          <div className="p-4 md:p-6 space-y-0 min-h-[340px] md:min-h-[400px] max-h-[500px] overflow-y-auto">
            {visibleMessages.map((msg, index) => {
              const isHank = msg.role === "hank";

              if (isHank) {
                return (
                  <div
                    key={`${activeIndex}-${index}`}
                    className="animate-message-in flex justify-start mb-6"
                  >
                    <div className="max-w-[85%]">
                      <div className="font-mono text-[0.7rem] font-bold uppercase tracking-wide text-accent mb-1">
                        Hank
                      </div>
                      <div className="break-words rounded-2xl rounded-bl-[4px] border border-border bg-hank-bubble px-4 py-3 text-[0.95rem] leading-[1.5] text-hank-text shadow">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={`${activeIndex}-${index}`}
                  className="animate-message-in flex justify-end mb-6"
                >
                  <div className="max-w-[85%]">
                    <div className="break-words rounded-2xl rounded-br-[4px] bg-user-bubble px-4 py-3 text-[0.95rem] leading-[1.5] text-user-text">
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && <DemoTypingIndicator />}

            {showVerdict && (
              <DemoVerdict
                verdict={currentConversation.verdict}
                price={currentConversation.price}
                quote={currentConversation.verdictQuote}
              />
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Static input bar (cosmetic) */}
          <div aria-hidden="true" className="px-4 py-3 md:px-6 md:py-4 border-t border-border">
            <div className="bg-input-bg rounded-xl border border-border px-4 py-3 flex items-center">
              <div className="text-text-secondary text-sm flex-1">
                Tell Hank what you want to buy...
              </div>
              <div className="w-8 h-8 rounded-[10px] bg-accent text-user-text flex items-center justify-center">
                <ArrowUp className="w-4 h-4 stroke-[2.5px]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

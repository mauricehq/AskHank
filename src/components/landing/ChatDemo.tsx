"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowUp, Droplets, Flame, Footprints, Monitor } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { SectionHeader } from "./SectionHeader";

// ---------------------------------------------------------------------------
// Types & data
// ---------------------------------------------------------------------------
interface Message {
  role: "user" | "hank";
  content: string;
}

/** Time to read a message before the next one appears (~220ms/word). */
function readingTime(text: string, minMs = 1500): number {
  return Math.max(minMs, text.split(/\s+/).length * 220);
}

/** Duration of typing indicator before Hank's message reveals (~80ms/word, min 1000ms). */
function typingTime(text: string): number {
  return Math.max(1000, text.split(/\s+/).length * 80);
}

interface DemoConversation {
  id: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  price: number;
  decision: "buying" | "skipping";
  reactionQuote: string;
  messages: Message[];
}

const CONVERSATIONS: DemoConversation[] = [
  {
    id: "sneakers",
    label: "Running Shoes",
    shortLabel: "Sneakers",
    icon: Footprints,
    price: 180,
    decision: "skipping",
    reactionQuote: "You folded faster than a lawn chair at a discount shoe sale.",
    messages: [
      { role: "user", content: "Found some running shoes marked down from $300 to $180. 40% off, seems like a steal." },
      { role: "hank", content: "$180 shoes because they were $300. You keep receipts like trophies for purchases you never actually use." },
      { role: "user", content: "No but 40% off doesn't come around often. I'd be losing money NOT buying them." },
      { role: "hank", content: "$180 is still $180. You'll wear them twice before they join the graveyard of \"good deals\" in your closet." },
      { role: "user", content: "ok fine you win" },
    ],
  },
  {
    id: "pressure-washer",
    label: "Pressure Washer",
    shortLabel: "Washer",
    icon: Droplets,
    price: 200,
    decision: "buying",
    reactionQuote: "Just promise me you'll use it more than once a season.",
    messages: [
      { role: "user", content: "Looking at buying a pressure washer to wash my car. Around $200." },
      { role: "hank", content: "You already wash your car without one. What's wrong with the hose and bucket method?" },
      { role: "user", content: "I wash every 2 weeks, Montreal winters destroy the paint. Grit gets stuck like glue." },
      { role: "hank", content: "A pressure washer won't stop winter from happening. How many car washes would $200 buy at the touchless place down the road?" },
      { role: "user", content: "Around 10, not even a full winter. And I have my own garage so I don't freeze outside." },
      { role: "hank", content: "Alright, fine. Winter in Montreal is a warzone and you've actually thought this through." },
    ],
  },
  {
    id: "candles",
    label: "Scented Candles",
    shortLabel: "Candles",
    icon: Flame,
    price: 45,
    decision: "skipping",
    reactionQuote: "Happiness isn't stored in pumpkin chai wax.",
    messages: [
      { role: "user", content: "I want to buy some scented candles, $45 from this brand I saw on TikTok." },
      { role: "hank", content: "TikTok told you to want these. TikTok also told you to want the last thing you barely used. What's different this time?" },
      { role: "user", content: "But it makes me happy. Self care is important." },
      { role: "hank", content: "You're confusing self-care with retail therapy. You know this." },
    ],
  },
  {
    id: "monitor",
    label: "Gaming Monitor",
    shortLabel: "Monitor",
    icon: Monitor,
    price: 800,
    decision: "skipping",
    reactionQuote: "You're not upgrading, you're just shopping with extra steps.",
    messages: [
      { role: "user", content: "I want a new 4K gaming monitor. About $800." },
      { role: "hank", content: "What's your current monitor failing at, exactly?" },
      { role: "user", content: "It's only 1080p and I play competitive shooters. The clarity difference at 4K is huge." },
      { role: "hank", content: "Last week it was $180 running shoes on sale. Now it's an $800 monitor. Convenient timing." },
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
// User typing indicator
// ---------------------------------------------------------------------------
function DemoUserTypingIndicator() {
  return (
    <div className="animate-message-in flex justify-end mb-6">
      <div className="max-w-[85%]">
        <div className="flex items-center gap-1 rounded-2xl rounded-br-[4px] bg-user-bubble px-4 py-3 w-fit">
          <span className="typing-dot h-2 w-2 rounded-full bg-user-text/50" />
          <span className="typing-dot h-2 w-2 rounded-full bg-user-text/50 [animation-delay:0.2s]" />
          <span className="typing-dot h-2 w-2 rounded-full bg-user-text/50 [animation-delay:0.4s]" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Decision card (simplified — no share/new-conversation buttons)
// ---------------------------------------------------------------------------
function DemoDecision({
  decision,
  price,
  quote,
}: {
  decision: "buying" | "skipping";
  price: number;
  quote: string;
}) {
  const isSkipping = decision === "skipping";
  return (
    <div
      className={`animate-decision-in text-center p-5 rounded-xl mt-2 mb-6 border-[1.5px] ${
        isSkipping
          ? "border-approved bg-[rgba(90,138,94,0.08)]"
          : "border-accent bg-[rgba(198,90,46,0.08)]"
      }`}
    >
      <div
        className={`text-[0.8rem] font-bold uppercase tracking-[0.12em] mb-2 ${
          isSkipping ? "text-approved" : "text-accent"
        }`}
      >
        {isSkipping ? "SKIPPING IT" : "BUYING IT"} ($
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
  const { ref, inView } = useInView<HTMLDivElement>(0.15);

  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [conversationDone, setConversationDone] = useState(false);
  const [showDecision, setShowDecision] = useState(false);
  const [autoCycleEnabled, setAutoCycleEnabled] = useState(true);
  const [showProgress, setShowProgress] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const currentConversation = CONVERSATIONS[activeIndex];

  // Auto-scroll chat container to bottom when messages change
  useEffect(() => {
    const el = chatContainerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [visibleCount, isTyping, isUserTyping, showDecision]);

  // Play through current conversation's messages
  useEffect(() => {
    if (!inView) return;

    setVisibleCount(0);
    setIsTyping(false);
    setIsUserTyping(false);
    setConversationDone(false);
    setShowDecision(false);
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
      if (i > 0) {
        const prev = messages[i - 1];
        // After the first user message, show typing quickly (700ms);
        // otherwise give full reading time for the previous message.
        const pause =
          i === 1 && prev.role === "user"
            ? 700
            : readingTime(prev.content, i <= 2 ? 1200 : 1500);
        elapsed += pause;
      }

      if (msg.role === "hank") {
        // Show typing dots immediately when previous message appeared
        const prev = messages[i - 1];
        const pause =
          i === 1 && prev.role === "user"
            ? 700
            : readingTime(prev.content, i <= 2 ? 1200 : 1500);
        schedule(() => setIsTyping(true), elapsed - pause);
        elapsed += typingTime(msg.content);
        schedule(() => {
          setIsTyping(false);
          setVisibleCount(i + 1);
        }, elapsed);
      } else if (i === 0) {
        // First message appears instantly, no typing indicator
        schedule(() => setVisibleCount(i + 1), elapsed);
      } else {
        // Show user typing dots immediately (reading pause already elapsed above)
        // userDotsStart = elapsed minus the full reading pause we just added
        const prev = messages[i - 1];
        const pause =
          i === 1 && prev.role === "user"
            ? 700
            : readingTime(prev.content, i <= 2 ? 1200 : 1500);
        schedule(() => setIsUserTyping(true), elapsed - pause);
        schedule(() => {
          setIsUserTyping(false);
          setVisibleCount(i + 1);
        }, elapsed);
      }
    });

    // Show decision after last message
    schedule(() => setShowDecision(true), elapsed + 1000);
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

  function handleUserScroll() {
    if (autoCycleEnabled) setAutoCycleEnabled(false);
  }

  const visibleMessages = currentConversation.messages.slice(0, visibleCount);

  return (
    <div className="py-20 md:py-32 px-4">
      <SectionHeader
        label="Sound Familiar?"
        subhead="You've had this argument with yourself before. Except you always win."
      />

      {/* Tab bar */}
      <div role="tablist" className="flex justify-center gap-3 sm:gap-6 mb-8 md:mb-12 px-2 flex-wrap">
        {CONVERSATIONS.map((conv, i) => {
          const Icon = conv.icon;
          return (
            <button
              key={conv.id}
              role="tab"
              aria-selected={i === activeIndex}
              onClick={() => handleTabClick(i)}
              className={`relative font-mono text-[0.65rem] sm:text-xs uppercase tracking-widest pb-2 whitespace-nowrap transition-colors duration-200 flex items-center gap-1.5 ${
                i === activeIndex
                  ? "text-text"
                  : "text-text-secondary hover:text-text"
              }`}
            >
              <Icon className="w-3.5 h-3.5 hidden sm:inline" />
              <span className="sm:hidden">{conv.shortLabel}</span>
              <span className="hidden sm:inline">
                {conv.label}
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
          );
        })}
      </div>

      {/* Chat window */}
      <div ref={ref} className="w-full max-w-3xl lg:max-w-4xl mx-auto relative">
        {/* Ambient glow */}
        <div className="absolute -inset-6 lg:-inset-12 bg-accent/8 blur-[80px] lg:blur-[120px] rounded-full pointer-events-none" />

        <div className="relative bg-bg-surface rounded-3xl lg:rounded-[2.5rem] border border-border/60 overflow-hidden flex flex-col select-none shadow-[0_40px_80px_rgba(0,0,0,0.6)] lg:shadow-[0_60px_120px_rgba(0,0,0,0.8)]">
          {/* App chrome header */}
          <div className="flex items-center gap-3 px-4 py-3 lg:px-8 lg:py-5 border-b border-border/60">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-border/60" />
              <div className="w-3 h-3 rounded-full bg-border/60" />
              <div className="w-3 h-3 rounded-full bg-border/60" />
            </div>
            <div className="w-px h-4 bg-border/40" />
            <span className="font-mono text-xs text-text-secondary tracking-wide">Ask Hank</span>
          </div>
          {/* Messages area */}
          <div ref={chatContainerRef} onWheel={handleUserScroll} onTouchMove={handleUserScroll} className="bg-bg p-5 md:p-7 lg:p-8 space-y-0 h-[340px] md:h-[400px] lg:h-[440px] overflow-y-scroll scrollbar-thin">
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
                      <div className="break-words rounded-2xl rounded-bl-[4px] border border-border bg-hank-bubble px-4 py-3 text-base leading-[1.5] text-hank-text shadow">
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
                    <div className="break-words rounded-2xl rounded-br-[4px] bg-user-bubble px-4 py-3 text-base leading-[1.5] text-user-text">
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && <DemoTypingIndicator />}
            {isUserTyping && <DemoUserTypingIndicator />}

            {showDecision && (
              <DemoDecision
                decision={currentConversation.decision}
                price={currentConversation.price}
                quote={currentConversation.reactionQuote}
              />
            )}
          </div>

          {/* Static input bar (cosmetic) */}
          <div aria-hidden="true" className="px-4 py-3 md:px-6 md:py-4 lg:px-8 lg:py-5 border-t border-border">
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

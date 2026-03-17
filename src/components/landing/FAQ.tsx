"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { useInView } from "@/hooks/useInView";

const faqs = [
  {
    question: "Is this just AI with a prompt that says 'be tough'?",
    answer:
      "No. Hank runs a scoring engine that tracks your arguments turn by turn. The AI doesn't decide when to give in — the math does.",
  },
  {
    question: "Does Hank ever say yes?",
    answer:
      "About 10% of the time. Make a real case and he'll come around.",
  },
  {
    question: "Does Hank remember past conversations?",
    answer:
      "Yes. Buy sneakers this week, try to justify a jacket next week — he'll notice the pattern.",
  },
  {
    question: "What happens when I run out of free messages?",
    answer:
      "Nothing. No lockout, no nag screens. Credit packs start at $1.99 when you want more.",
  },
  {
    question: "Is my data private?",
    answer:
      "Your conversations stay between you and Hank. No ads. No data selling.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { ref, inView } = useInView<HTMLDivElement>(0.15);

  return (
    <div className="py-20 md:py-32 px-6">
      <SectionHeader label="FAQ" />

      <div ref={ref} className="max-w-2xl mx-auto rounded-2xl border border-border bg-bg-card p-2 sm:p-8">
        {faqs.map((faq, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={i}
              className={`border-b border-border last:border-0 animate-in-ready ${inView ? "animate-in-visible" : ""}`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="w-full py-5 flex items-center justify-between text-left hover:bg-white/5 transition-colors rounded-lg px-2 -mx-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
              >
                <span className="text-[0.95rem] font-semibold text-text">
                  {faq.question}
                </span>
                <span className={`ml-6 shrink-0 text-accent transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>
                  {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </span>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isOpen ? "max-h-48 opacity-100 pb-5" : "max-h-0 opacity-0"
                }`}
              >
                <p className="text-sm text-text-secondary leading-relaxed pr-12">
                  {faq.answer}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

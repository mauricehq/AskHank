"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

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

  return (
    <div className="py-20 md:py-32 px-6">
      <SectionHeader label="FAQ" />

      <div className="max-w-2xl mx-auto space-y-2">
        {faqs.map((faq, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={i} className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-white/5 transition-colors"
              >
                <span className="text-sm font-semibold text-text">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-text-secondary shrink-0 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-6 pb-4">
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

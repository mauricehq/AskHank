import { Scale, Brain, BarChart3 } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

const cards = [
  {
    number: "01",
    title: "He scores your arguments.",
    description:
      "Every claim you make gets weighed. Vague feelings don't score well.",
    icon: Scale,
  },
  {
    number: "02",
    title: "He remembers your patterns.",
    description:
      "Bought sneakers last week? He knows. Tried this argument before? He noticed.",
    icon: Brain,
  },
  {
    number: "03",
    title: "~10% of purchases get through.",
    description:
      "Hank concedes when you earn it. Most don't.",
    icon: BarChart3,
  },
];

export function HowItWorks() {
  return (
    <div className="py-20 md:py-32 px-6">
      <SectionHeader
        label="Not Just Attitude"
        subhead="There's a brain behind the sarcasm."
      />

      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 lg:gap-16">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.number} className="relative text-center sm:text-left">
                <div className="flex items-center gap-3 mb-4 justify-center sm:justify-start">
                  {/* Number badge */}
                  <div className="w-10 h-10 rounded-full border border-border bg-bg flex items-center justify-center font-mono text-sm font-bold text-accent">
                    {card.number}
                  </div>
                  <Icon className="w-5 h-5 text-text-secondary" />
                </div>
                <h3 className="text-lg font-bold text-text mb-2">
                  {card.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

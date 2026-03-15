import { MessageSquare, Swords, Scale } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

const steps = [
  {
    number: "01",
    title: "Tell Hank what you want to buy.",
    description: "Open a conversation. Type the item. That's it.",
    icon: MessageSquare,
  },
  {
    number: "02",
    title: "He pushes back. You push back.",
    description:
      "If your argument holds up, he'll come around. Most don't.",
    icon: Swords,
  },
  {
    number: "03",
    title: 'You get a verdict. Usually "no."',
    description:
      "When the case is closed, you see exactly how much you didn't spend — or didn't need to.",
    icon: Scale,
  },
];

export function HowItWorks() {
  return (
    <div className="py-20 md:py-32 px-6">
      <SectionHeader
        label="It's Just a Conversation"
        subhead="No spreadsheets. No tracking. No homework."
      />

      <div className="max-w-5xl mx-auto relative">
        {/* Connecting line on desktop */}
        <div className="hidden lg:block absolute top-6 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 lg:gap-16">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="relative text-center sm:text-left">
                <div className="flex items-center gap-3 mb-4 justify-center sm:justify-start">
                  {/* Number badge */}
                  <div className="w-10 h-10 rounded-full border border-border bg-bg flex items-center justify-center font-mono text-sm font-bold text-accent">
                    {step.number}
                  </div>
                  <Icon className="w-5 h-5 text-text-secondary" />
                </div>
                <h3 className="text-lg font-bold text-text mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

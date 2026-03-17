import { X, Check } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

const failures = [
  {
    label: "Timers",
    description:
      "You wait 24 hours and buy it anyway. The impulse was delayed, not killed.",
  },
  {
    label: "Streaks",
    description:
      "Not buying something isn't an action. No engagement, no confrontation.",
  },
  {
    label: "Checklists",
    description:
      '"Do I need this?" You check yes. "Can I afford it?" You check yes. You buy it.',
  },
];

export function WhyHankWorks() {
  return (
    <div className="py-20 md:py-32 px-6">
      <SectionHeader label="You've Tried Everything Else" />

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
        {/* Left: explanation */}
        <div className="text-text-secondary text-[0.95rem] leading-relaxed space-y-4">
          <p>
            You&apos;ve tried the 24-hour rule. The no-buy challenge. The
            spreadsheet. None of it stuck — because none of it pushed back.
          </p>
          <p>
            Hank makes you argue your case out loud. When you have to explain
            why you need a $900 espresso machine to someone who pushes back,
            you hear your own weak arguments. The impulse dies in the
            conversation, not after a timer.
          </p>
        </div>

        {/* Right: list */}
        <div className="space-y-6">
          {failures.map((item) => (
            <div key={item.label} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-denied/10 flex items-center justify-center shrink-0">
                <X className="w-4 h-4 text-denied" />
              </div>
              <div>
                <div className="font-semibold text-text mb-1">{item.label}</div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}

          <div className="flex gap-3 bg-accent/5 border border-accent/20 rounded-xl p-4">
            <div className="w-8 h-8 rounded-full bg-approved/10 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 text-approved" />
            </div>
            <div>
              <div className="font-semibold text-text mb-1">Hank</div>
              <p className="text-sm text-text-secondary leading-relaxed">
                A debate you have to win. That&apos;s what stops you.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

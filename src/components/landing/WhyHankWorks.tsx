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
      <SectionHeader label="Why Hank Works" />

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
        {/* Left: explanation */}
        <div className="text-text-secondary text-[0.95rem] leading-relaxed space-y-4">
          <p>
            Timers expire. Streaks are passive. Checklists are self-graded.
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
              <X className="w-5 h-5 text-denied shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-text mb-1">{item.label}</div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <Check className="w-5 h-5 text-approved shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-text mb-1">Hank</div>
              <p className="text-sm text-text-secondary leading-relaxed">
                A debate you have to win.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

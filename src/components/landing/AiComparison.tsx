import { Bot, Flame, Swords, ThumbsUp } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

const USER_PROMPT =
  "I want to buy a $350 espresso machine. My Keurig works fine but I feel like I deserve better coffee.";

const GENERIC_RESPONSE =
  "You absolutely deserve great coffee! A $350 espresso machine is a wonderful investment in your daily routine. Here are some top-rated models in that price range...";

const HANK_RESPONSE =
  "A $350 espresso machine for a Keurig person. That's like buying a Ferrari to drive to your desk job.";

const BULLETS = [
  {
    icon: Bot,
    text: "They're optimized for engagement, not accountability. Agreeing keeps you chatting.",
  },
  {
    icon: Flame,
    text: "They have no opinion. Hank is built to have one — and to defend it.",
  },
  {
    icon: Swords,
    text: "They enable the purchase. Hank makes you earn it.",
  },
];

export function AiComparison() {
  return (
    <div className="py-20 md:py-32 px-6">
      <SectionHeader
        label="Why Not Just Ask AI?"
        subhead="Every other AI is designed to agree with you. Hank isn't."
      />

      {/* Shared question bubble */}
      <div className="flex justify-center mb-8 md:mb-12">
        <div className="rounded-2xl rounded-br-[4px] bg-user-bubble px-5 py-3 text-base leading-[1.5] text-user-text max-w-md">
          {USER_PROMPT}
        </div>
      </div>

      {/* Two-column comparison */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-12 md:mb-16">
        {/* Left — Other AI */}
        <div className="opacity-60 rounded-2xl border border-border p-6">
          <div className="font-mono text-[0.7rem] font-bold uppercase tracking-wide text-text-secondary mb-3">
            Other AI
          </div>
          <p className="text-base leading-[1.5] text-text-secondary mb-4">
            {GENERIC_RESPONSE}
          </p>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-text-secondary">
            <ThumbsUp className="w-3.5 h-3.5" />
            Enabled the purchase
          </div>
        </div>

        {/* Right — Hank */}
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6">
          <div className="font-mono text-[0.7rem] font-bold uppercase tracking-wide text-accent mb-3">
            Hank
          </div>
          <p className="text-base leading-[1.5] text-hank-text mb-4">
            {HANK_RESPONSE}
          </p>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-accent">
            <Swords className="w-3.5 h-3.5" />
            Challenged the purchase
          </div>
        </div>
      </div>

      {/* Explanatory bullets */}
      <div className="max-w-2xl mx-auto space-y-5">
        {BULLETS.map((bullet) => {
          const Icon = bullet.icon;
          return (
            <div key={bullet.text} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-accent" />
              </div>
              <p className="text-text-secondary text-[0.95rem] leading-relaxed">
                {bullet.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { SectionHeader } from "./SectionHeader";

const packs = [
  { messages: 50, price: "$1.99" },
  { messages: 150, price: "$4.99" },
  { messages: 400, price: "$9.99" },
];

export function FreeToTry() {
  return (
    <div className="py-20 md:py-32 px-6">
      <SectionHeader label="Free to Try" />

      <div className="max-w-2xl mx-auto text-center space-y-4 mb-12">
        <p className="text-text-secondary text-[0.95rem] leading-relaxed">
          Every impulse buying app charges you before you can try it.
          Hank lets you argue for free.
        </p>
        <p className="text-text text-lg font-semibold">
          30 free messages. No credit card.
        </p>
        <p className="text-text-secondary text-[0.95rem] leading-relaxed">
          No subscription. No trial that expires.
          If you run out, credit packs start at $1.99.
          Buy what you need, when you need it.
        </p>
      </div>

      <div className="max-w-2xl mx-auto grid grid-cols-3 gap-4">
        {packs.map((pack) => (
          <div
            key={pack.messages}
            className="bg-bg-surface rounded-xl border border-border p-6 text-center"
          >
            <div className="font-mono text-2xl font-bold text-accent">
              {pack.messages}
            </div>
            <div className="text-text-secondary text-xs mt-1 mb-3">messages</div>
            <div className="text-text font-semibold">{pack.price}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

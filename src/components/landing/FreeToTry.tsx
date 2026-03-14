import { SectionHeader } from "./SectionHeader";

const packs = [
  { messages: 50, price: "$1.99", popular: false },
  { messages: 150, price: "$4.99", popular: true },
  { messages: 400, price: "$9.99", popular: false },
];

export function FreeToTry() {
  return (
    <div className="py-20 md:py-32 px-6">
      <SectionHeader label="Free to Try" />

      <div className="max-w-2xl mx-auto text-center space-y-4 mb-12">
        {/* No subscription badge */}
        <div className="flex justify-center mb-6">
          <span className="font-mono text-xs uppercase tracking-widest text-accent border border-accent/20 bg-accent/5 px-3 py-1 rounded-full">
            No subscription
          </span>
        </div>
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
            className={`rounded-xl border p-6 text-center relative ${
              pack.popular
                ? "bg-bg-surface border-accent/40 shadow-lg"
                : "bg-bg-surface border-border"
            }`}
          >
            {pack.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="font-mono text-[0.6rem] uppercase tracking-widest text-accent bg-bg border border-accent/30 px-2 py-0.5 rounded-full whitespace-nowrap">
                  Most Popular
                </span>
              </div>
            )}
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

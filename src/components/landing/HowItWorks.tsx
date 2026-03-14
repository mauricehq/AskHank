import { SectionHeader } from "./SectionHeader";

const steps = [
  {
    number: "01",
    title: "Tell Hank what you want to buy.",
    description: "Open a conversation. Type the item. That's it.",
  },
  {
    number: "02",
    title: "Make your case.",
    description:
      "Hank pushes back. You push back harder. If your argument holds up, he'll come around.",
  },
  {
    number: "03",
    title: 'You get a verdict. Usually "no."',
    description:
      "When the case is closed, you see exactly how much you didn't spend — or didn't need to.",
  },
];

export function HowItWorks() {
  return (
    <div className="py-20 md:py-32 px-6">
      <SectionHeader label="How It Works" />

      <div className="max-w-5xl mx-auto relative">
        {/* Connecting line on desktop */}
        <div className="hidden lg:block absolute top-6 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 lg:gap-16">
          {steps.map((step) => (
            <div key={step.number} className="relative text-center sm:text-left">
              <div className="font-mono text-2xl font-bold text-accent mb-4">
                {step.number}
              </div>
              <h3 className="text-lg font-bold text-text mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

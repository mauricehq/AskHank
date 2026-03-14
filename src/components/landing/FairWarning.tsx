import { AlertTriangle } from "lucide-react";

export function FairWarning() {
  return (
    <div className="bg-bg-surface border-t border-b border-border py-16 md:py-20 px-6">
      <div className="max-w-xl mx-auto text-center space-y-4">
        {/* Label with icon */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <AlertTriangle className="w-4 h-4 text-accent" />
          <span className="font-mono uppercase tracking-[0.3em] text-xs text-accent font-bold">
            Fair Warning
          </span>
        </div>

        <div className="text-[0.95rem] text-text-secondary leading-relaxed space-y-4">
          <p>
            Hank is not a therapist. Not a budgeting app.
            Not gentle. Not supportive. Not encouraging.
          </p>
          <p>
            He is a debate partner. Sarcastic, blunt, and usually right.
            Like a friend who&apos;s better with money than you are.
          </p>
          <p className="font-semibold text-text">
            If you can&apos;t take the debate, don&apos;t sign up.
          </p>
        </div>
      </div>
    </div>
  );
}

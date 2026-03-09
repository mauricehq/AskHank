import type { Verdict } from "@/types/chat";

interface VerdictCardProps {
  verdict: Verdict;
  onNewConversation: () => void;
}

export function VerdictCard({ verdict, onNewConversation }: VerdictCardProps) {
  const isDenied = verdict.type === "denied";

  return (
    <div
      className={`text-center p-5 rounded-xl mt-2 mb-6 border-[1.5px] ${
        isDenied
          ? "border-denied bg-[rgba(198,90,46,0.08)]"
          : "border-approved bg-[rgba(90,138,94,0.08)]"
      }`}
    >
      <div
        className={`text-[0.8rem] font-bold uppercase tracking-[0.12em] mb-2 ${
          isDenied ? "text-denied" : "text-approved"
        }`}
      >
        CASE CLOSED — {isDenied ? "DENIED" : "APPROVED"}
      </div>
      <p className="text-[0.9rem] italic text-text-secondary mb-4">
        &ldquo;{verdict.quote}&rdquo;
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          disabled
          className="rounded-[10px] border border-accent text-accent px-4 py-2.5 text-sm font-semibold hover:bg-accent-soft disabled:opacity-50 disabled:pointer-events-none"
        >
          Share
        </button>
        <button
          onClick={onNewConversation}
          className="rounded-[10px] bg-accent text-user-text px-4 py-2.5 text-sm font-semibold hover:bg-accent-hover active:scale-[0.97]"
        >
          New conversation
        </button>
      </div>
    </div>
  );
}

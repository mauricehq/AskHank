export function TypingIndicator() {
  return (
    <div className="animate-message-in flex justify-start mb-6">
      <div className="max-w-[85%]">
        <div className="font-mono text-[0.7rem] font-bold uppercase tracking-wide text-accent mb-1">
          Hank
        </div>
        <div className="flex items-center gap-1 rounded-2xl rounded-bl-[4px] border border-border bg-hank-bubble px-4 py-3 shadow w-fit">
          <span className="typing-dot h-2 w-2 rounded-full bg-text-secondary" />
          <span className="typing-dot h-2 w-2 rounded-full bg-text-secondary [animation-delay:0.2s]" />
          <span className="typing-dot h-2 w-2 rounded-full bg-text-secondary [animation-delay:0.4s]" />
        </div>
        <div className="mt-1.5 text-[0.7rem] text-text-secondary animate-fade-in opacity-0" style={{ animationDelay: "0.4s", animationFillMode: "both" }}>Hank is thinking...</div>
      </div>
    </div>
  );
}

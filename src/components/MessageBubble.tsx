import type { Message } from "@/types/chat";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isHank = message.role === "hank";

  if (isHank) {
    return (
      <div className="animate-message-in flex justify-start mb-6">
        <div className="max-w-[85%]">
          <div className="font-mono text-[0.7rem] font-bold uppercase tracking-wide text-accent mb-1">
            Hank
          </div>
          <div className="break-words rounded-2xl rounded-bl-[4px] border border-border bg-hank-bubble px-4 py-3 text-[0.95rem] leading-[1.5] text-hank-text shadow">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-message-in flex justify-end mb-6">
      <div className="max-w-[85%]">
        <div className="break-words rounded-2xl rounded-br-[4px] bg-user-bubble px-4 py-3 text-[0.95rem] leading-[1.5] text-user-text">
          {message.content}
        </div>
      </div>
    </div>
  );
}

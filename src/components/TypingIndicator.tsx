"use client";

import { motion } from "framer-motion";

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex justify-start mb-6"
    >
      <div className="max-w-[85%]">
        <div className="font-mono text-[0.7rem] font-bold uppercase tracking-wide text-accent mb-1">
          Hank
        </div>
        <div className="flex items-center gap-1 rounded-2xl rounded-bl-[4px] border border-border bg-hank-bubble px-4 py-3 shadow w-fit">
          <span className="typing-dot h-2 w-2 rounded-full bg-text-secondary" />
          <span className="typing-dot h-2 w-2 rounded-full bg-text-secondary [animation-delay:0.2s]" />
          <span className="typing-dot h-2 w-2 rounded-full bg-text-secondary [animation-delay:0.4s]" />
        </div>
      </div>
    </motion.div>
  );
}

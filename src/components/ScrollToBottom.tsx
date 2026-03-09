"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface ScrollToBottomProps {
  visible: boolean;
  onClick: () => void;
}

export function ScrollToBottom({ visible, onClick }: ScrollToBottomProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15 }}
          onClick={onClick}
          className="absolute bottom-20 right-4 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border bg-bg-card shadow-lg"
          aria-label="Scroll to bottom"
        >
          <ChevronDown size={16} className="text-text-secondary" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

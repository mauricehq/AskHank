"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface ThemeToggleProps {
  size?: "sm" | "md";
}

export function ThemeToggle({ size = "md" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const iconSize = size === "sm" ? 16 : 20;
  const buttonSize = size === "sm" ? "h-8 w-8" : "h-10 w-10";

  if (!mounted) {
    return (
      <div
        className={`${buttonSize} rounded-[10px]`}
        aria-hidden="true"
      />
    );
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className={`flex ${buttonSize} items-center justify-center rounded-[10px] text-text-secondary hover:bg-bg-surface hover:text-text`}
      aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={resolvedTheme}
          initial={{ opacity: 0, rotate: -90 }}
          animate={{ opacity: 1, rotate: 0 }}
          exit={{ opacity: 0, rotate: 90 }}
          transition={{ duration: 0.15 }}
          className="flex items-center justify-center"
        >
          {resolvedTheme === "dark" ? <Sun size={iconSize} /> : <Moon size={iconSize} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

import type { Transition, Variants } from "framer-motion";

/** Shared easing curve used across all motion animations. */
export const ease = [0.25, 0.1, 0.25, 1] as const;

/**
 * Staggered fade-up props for cascading entrance.
 * Spread onto a `<motion.div>`: `<motion.div {...cascade(i)}>`.
 * Caps at `maxIndex` to avoid excessive delays on long lists.
 */
export const cascade = (i: number, opts?: { maxIndex?: number }) => {
  const capped = Math.min(i, opts?.maxIndex ?? 20);
  return {
    initial: { opacity: 0, y: 10 } as const,
    animate: { opacity: 1, y: 0 } as const,
    transition: { duration: 0.35, ease, delay: capped * 0.06 } as Transition,
  };
};

/** Simple opacity fade. */
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

/** Scale + fade — good for modals, cards. */
export const scaleFadeVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

/** Standard enter transition. */
export const enterTransition: Transition = { duration: 0.3, ease };

import { useEffect, useRef, useState } from "react";
import { useSpring, useMotionValueEvent } from "framer-motion";

/**
 * Animates a number from its previous value to the new value using spring physics.
 * Snaps on first render (no animation from 0).
 */
export function useCountUp(value: number): number {
  const [display, setDisplay] = useState(value);
  const isFirstRender = useRef(true);

  const spring = useSpring(value, { stiffness: 80, damping: 20 });

  useMotionValueEvent(spring, "change", (latest) => {
    setDisplay(latest);
  });

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      spring.jump(value);
    } else {
      spring.set(value);
    }
  }, [value, spring]);

  return display;
}

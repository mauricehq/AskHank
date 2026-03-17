"use client";

import { useInView } from "@/hooks/useInView";

interface AnimateInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  threshold?: number;
  as?: "div" | "section";
  id?: string;
}

export function AnimateIn({
  children,
  className = "",
  delay = 0,
  threshold = 0.15,
  as: Tag = "div",
  id,
}: AnimateInProps) {
  const { ref, inView } = useInView(threshold);

  return (
    <Tag
      ref={ref as React.RefObject<any>}
      id={id}
      className={`animate-in-ready ${inView ? "animate-in-visible" : ""} ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

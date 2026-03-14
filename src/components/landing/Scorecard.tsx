"use client";

import { useState, useEffect } from "react";
import { TrendingDown, Clock } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useCountUp } from "@/hooks/useCountUp";
import { SectionHeader } from "./SectionHeader";

export function Scorecard() {
  const { ref, inView } = useInView(0.3);
  const [target, setTarget] = useState({ dollars: 0, hours: 0, denied: 0, approved: 0 });

  useEffect(() => {
    if (inView) {
      setTarget({ dollars: 2847, hours: 114, denied: 47, approved: 3 });
    }
  }, [inView]);

  const dollars = useCountUp(target.dollars);
  const hours = useCountUp(target.hours);
  const denied = useCountUp(target.denied);
  const approved = useCountUp(target.approved);

  return (
    <div className="py-20 md:py-32 px-6" ref={ref}>
      <SectionHeader label="Track Your Wins" />

      <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Savings card */}
        <div className="bg-bg-card rounded-xl border border-border border-t-2 border-t-accent p-8 text-center">
          <TrendingDown className="w-6 h-6 text-accent mx-auto mb-3" />
          <p className="text-text-secondary text-sm mb-2">You&apos;ve saved</p>
          <div className="font-mono text-5xl font-bold text-text">
            ${Math.round(dollars).toLocaleString()}
          </div>
          <p className="text-text-secondary text-sm mt-2">this year</p>
          <div className="mt-6 text-text-secondary text-sm">
            <span className="font-mono text-denied font-semibold">{Math.round(denied)}</span> talked out of
            <span className="mx-2">&middot;</span>
            <span className="font-mono text-approved font-semibold">{Math.round(approved)}</span> approved
          </div>
        </div>

        {/* Hours card */}
        <div className="bg-bg-card rounded-xl border border-border p-8 text-center">
          <Clock className="w-6 h-6 text-text-secondary mx-auto mb-3" />
          <p className="text-text-secondary text-sm mb-2">That&apos;s</p>
          <div className="font-mono text-5xl font-bold text-text">
            {Math.round(hours)}
          </div>
          <p className="text-text-secondary text-sm mt-2">hours of work</p>
          <div className="mt-6 text-text font-semibold text-sm">
            You kept.
          </div>
        </div>
      </div>

      <p className="text-center text-text-secondary text-sm mt-8">
        Every denied purchase adds to your total. The app pays for itself.
      </p>
    </div>
  );
}

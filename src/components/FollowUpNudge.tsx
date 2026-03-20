"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { getNudgeQuip, getOutcomeReaction } from "@/lib/followUpQuips";
import Link from "next/link";
import type { Id } from "../../convex/_generated/dataModel";

export function FollowUpNudge() {
  const pending = useQuery(api.conversations.getPendingFollowUps);
  const recordOutcome = useMutation(api.conversations.recordOutcome);

  const [dismissed, setDismissed] = useState(false);
  const [reactionText, setReactionText] = useState<string | null>(null);
  const [quip, setQuip] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reactingToId = useRef<string | null>(null);

  const first = pending?.[0];
  const firstId = first?._id;

  // Generate quip when item changes — but don't interrupt an active reaction
  useEffect(() => {
    if (reactingToId.current) return; // reaction in progress, don't reset
    if (first && first.decision && first.decision !== "thinking") {
      setQuip(getNudgeQuip(first.decision, first.item, first.hankScore));
      setReactionText(null);
      setDismissed(false);
      setIsSubmitting(false);
    }
  }, [firstId]);

  const handleOutcome = useCallback(
    async (outcome: "purchased" | "skipped") => {
      if (!first || !first.decision || first.decision === "thinking") return;
      if (isSubmitting) return;
      setIsSubmitting(true);

      const reaction = getOutcomeReaction(
        first.decision,
        outcome,
        first.item,
        first.hankScore
      );
      setReactionText(reaction);
      reactingToId.current = first._id;

      try {
        await recordOutcome({
          conversationId: first._id as Id<"conversations">,
          outcome,
        });
      } catch {
        // UI already showed reaction
      }

      // Show reaction for 2.5s, then dismiss and allow next item
      setTimeout(() => {
        reactingToId.current = null;
        setDismissed(true);
        // After dismiss animation, reset for next item if one exists
        setTimeout(() => {
          setDismissed(false);
          setReactionText(null);
          setIsSubmitting(false);
        }, 300);
      }, 2500);
    },
    [first, recordOutcome, isSubmitting]
  );

  if (!pending || pending.length === 0 || !first || dismissed) return null;
  if (!first.decision || first.decision === "thinking") return null;

  // If we're reacting and the item we reacted to is gone from the list,
  // still show the reaction (reactingToId prevents premature reset)
  const remainingCount = pending.length - (reactionText ? 0 : 1);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={reactionText ? "reaction" : "nudge"}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-[600px] mb-4"
      >
        <div className="rounded-2xl border border-border bg-bg-surface p-4">
          <div className="flex items-start gap-3">
            {/* Hank icon */}
            <img
              src="/AskHankIcon.svg"
              alt=""
              width={28}
              height={28}
              className="shrink-0 mt-0.5"
            />

            <div className="min-w-0 flex-1">
              {reactionText ? (
                // Reaction state
                <p className="text-sm text-text italic">{reactionText}</p>
              ) : (
                // Nudge state
                <>
                  <p className="text-sm text-text">{quip}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleOutcome("skipped")}
                      disabled={isSubmitting}
                      className="rounded-lg bg-approved/10 px-3.5 py-1.5 text-xs font-semibold text-approved hover:bg-approved/20 transition-colors disabled:opacity-50"
                    >
                      Didn&apos;t buy
                    </button>
                    <button
                      onClick={() => handleOutcome("purchased")}
                      disabled={isSubmitting}
                      className="rounded-lg bg-accent/10 px-3.5 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
                    >
                      Bought it
                    </button>
                  </div>
                  {remainingCount > 0 && (
                    <Link
                      href="/follow-ups"
                      className="mt-2 inline-block text-xs text-text-secondary hover:text-accent transition-colors"
                    >
                      {remainingCount} more to check &rarr;
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

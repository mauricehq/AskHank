"use client";

import { useState, useCallback, useEffect } from "react";
import { ArrowLeft, Check, ShoppingCart } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { cascade } from "@/lib/motion";
import { getNudgeQuip, getOutcomeReaction } from "@/lib/followUpQuips";
import type { Id } from "../../convex/_generated/dataModel";

interface FollowUpsPageProps {
  onBack: () => void;
}

export function FollowUpsPage({ onBack }: FollowUpsPageProps) {
  const pending = useQuery(api.conversations.getPendingFollowUps);
  const stats = useQuery(api.stats.getStats);

  if (pending === undefined) return null;

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="shrink-0 border-b border-border px-4 py-3 md:px-6">
        <div className="mx-auto max-w-[720px]">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-surface hover:text-text"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-lg font-bold tracking-tight text-text">
              Follow-ups
            </h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] px-4 py-5 md:px-6 md:py-8 space-y-3">
          {pending.length === 0 ? (
            <motion.div
              {...cascade(0)}
              className="py-12 text-center"
            >
              <h2 className="text-lg font-bold text-text">All caught up.</h2>
              <p className="mt-2 text-sm text-text-secondary">
                No pending follow-ups right now.
              </p>
              {stats && (
                <div className="mt-6 flex justify-center gap-6">
                  <div className="text-center">
                    <div className="text-xl font-bold text-accent">
                      ${Math.round(stats.savedTotal).toLocaleString()}
                    </div>
                    <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-text-secondary">
                      saved
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-approved">
                      {stats.skippedCount}
                    </div>
                    <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-text-secondary">
                      skipped
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            pending.map((item, i) => (
              <motion.div key={item._id} {...cascade(i)}>
                <FollowUpCard
                  id={item._id}
                  item={item.item}
                  decision={item.decision as "buying" | "skipping"}
                  hankScore={item.hankScore}
                  estimatedPrice={item.estimatedPrice}
                  createdAt={item.createdAt}
                />
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function FollowUpCard({
  id,
  item,
  decision,
  hankScore,
  estimatedPrice,
  createdAt,
}: {
  id: string;
  item?: string | null;
  decision: "buying" | "skipping";
  hankScore?: number | null;
  estimatedPrice?: number;
  createdAt: number;
}) {
  const recordOutcome = useMutation(api.conversations.recordOutcome);
  const [reactionText, setReactionText] = useState<string | null>(null);
  const [exiting, setExiting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quip, setQuip] = useState("");

  useEffect(() => {
    setQuip(getNudgeQuip(decision, item, hankScore));
  }, [decision, item, hankScore]);

  const elapsed = formatElapsed(createdAt);
  const isBuying = decision === "buying";
  const Icon = isBuying ? ShoppingCart : Check;
  const iconBg = isBuying ? "bg-accent/10 text-accent" : "bg-approved/10 text-approved";
  const badgeClass = isBuying
    ? "bg-accent/10 text-accent"
    : "bg-approved/10 text-approved";

  const handleOutcome = useCallback(
    async (outcome: "purchased" | "skipped") => {
      if (isSubmitting) return;
      setIsSubmitting(true);

      const reaction = getOutcomeReaction(decision, outcome, item, hankScore);
      setReactionText(reaction);

      try {
        await recordOutcome({ conversationId: id as Id<"conversations">, outcome });
      } catch {
        // UI already showed reaction
      }

      setTimeout(() => setExiting(true), 2500);
    },
    [id, decision, item, hankScore, recordOutcome, isSubmitting]
  );

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-border bg-bg-surface p-4"
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
            >
              <Icon size={14} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[0.9rem] font-bold capitalize truncate text-text">
                  {item ?? "Unknown item"}
                </span>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide ${badgeClass}`}
                >
                  {decision}
                </span>
              </div>
              <div className="text-[0.7rem] text-text-secondary mt-0.5">
                {estimatedPrice != null && estimatedPrice > 0 && (
                  <>
                    <span className="font-semibold">${estimatedPrice.toLocaleString()}</span> ·{" "}
                  </>
                )}
                {hankScore != null && (
                  <>Hank Score {hankScore} · </>
                )}
                {elapsed}
              </div>

              {reactionText ? (
                <p className="mt-2 text-sm italic text-text">{reactionText}</p>
              ) : (
                <>
                  <p className="mt-2 text-sm text-text-secondary">{quip}</p>
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
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function formatElapsed(timestamp: number): string {
  const diff = Math.max(0, Date.now() - timestamp);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

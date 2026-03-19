"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { DecisionCardData } from "@/lib/cards/types";
import { getHankScoreLabel } from "@/lib/hankScore";
import { ShareCardModal } from "./share/ShareCardModal";

const DECISION_CONFIG = {
  buying: {
    label: "BUYING IT",
    colorClass: "border-accent bg-accent/8 text-accent",
    glowColor: "rgba(198,90,46,0.25)",
  },
  skipping: {
    label: "SKIPPING IT",
    colorClass: "border-approved bg-approved/8 text-approved",
    glowColor: "rgba(90,138,94,0.25)",
  },
  thinking: {
    label: "NEED TO THINK",
    colorClass: "border-border bg-bg-surface text-text-secondary",
    glowColor: "rgba(128,128,128,0.15)",
  },
} as const;

interface DecisionCardProps {
  decision: "buying" | "skipping" | "thinking";
  reactionText?: string | null;
  hankScore?: number | null;
  item?: string;
  estimatedPrice?: number;
  category?: string;
  conversationId?: Id<"conversations">;
  onNewConversation: () => void;
}

export function DecisionCard({
  decision,
  reactionText,
  hankScore,
  item,
  estimatedPrice,
  category,
  conversationId,
  onNewConversation,
}: DecisionCardProps) {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const createDecisionCard = useMutation(api.shareCards.createDecisionCard);

  const config = DECISION_CONFIG[decision];
  const itemLabel = item
    ? `: ${item}${estimatedPrice ? ` ($${estimatedPrice.toLocaleString()})` : ""}`
    : "";

  const handleShare = useCallback(async () => {
    if (!conversationId) return;

    setIsCreating(true);
    try {
      const token = await createDecisionCard({ conversationId });
      setShareToken(token);
      setShareModalOpen(true);
    } catch (error) {
      console.error("Failed to create share card:", error);
    } finally {
      setIsCreating(false);
    }
  }, [conversationId, createDecisionCard]);

  const cardData: DecisionCardData = {
    decision,
    item: item ?? "Unknown item",
    estimatedPrice,
    category,
    reactionText: reactionText ?? undefined,
    hankScore: hankScore ?? undefined,
  };

  return (
    <>
      <div
        className={`animate-decision-in text-center p-5 rounded-xl mt-2 mb-6 border-[1.5px] ${config.colorClass}`}
        style={{ "--decision-glow": config.glowColor } as React.CSSProperties}
      >
        <div className={`text-[0.8rem] font-bold uppercase tracking-[0.12em] mb-2`}>
          YOU DECIDED: {config.label}<span className="capitalize">{itemLabel}</span>
        </div>

        {hankScore != null && (
          <div className="mb-3">
            <div className="flex items-center justify-center gap-2 text-[0.75rem] text-text-secondary">
              <span className="font-semibold">Hank Score: {hankScore}/10</span>
              <span className="text-text-secondary/70">— {getHankScoreLabel(hankScore)}</span>
            </div>
            <div className="mt-1.5 mx-auto max-w-[200px] h-1.5 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${(hankScore / 10) * 100}%` }}
              />
            </div>
          </div>
        )}

        <p className="text-[0.9rem] italic text-text-secondary mb-4">
          {reactionText
            ? reactionText
            : <span className="inline-flex items-center gap-1">
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-text-secondary" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-text-secondary [animation-delay:0.2s]" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-text-secondary [animation-delay:0.4s]" />
              </span>
          }
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleShare}
            disabled={!conversationId || isCreating}
            className="rounded-[10px] border border-accent text-accent px-4 py-2.5 text-sm font-semibold hover:bg-accent-soft disabled:opacity-50 disabled:pointer-events-none"
          >
            {isCreating ? "..." : "Share"}
          </button>
          <button
            onClick={onNewConversation}
            className="rounded-[10px] bg-accent text-user-text px-4 py-2.5 text-sm font-semibold hover:bg-accent-hover active:scale-[0.97]"
          >
            New conversation
          </button>
        </div>
      </div>

      {shareToken && (
        <ShareCardModal
          open={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          token={shareToken}
          cardType="decision"
          cardData={cardData}
        />
      )}
    </>
  );
}

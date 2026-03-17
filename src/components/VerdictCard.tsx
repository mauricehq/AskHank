"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Verdict } from "@/types/chat";
import type { VerdictCardData } from "@/lib/cards/types";
import { ShareCardModal } from "./share/ShareCardModal";

interface VerdictCardProps {
  verdict: Verdict;
  item?: string;
  estimatedPrice?: number;
  category?: string;
  verdictSummary?: string;
  shareScore?: number;
  conversationId?: Id<"conversations">;
  onNewConversation: () => void;
}

export function VerdictCard({ verdict, item, estimatedPrice, category, verdictSummary, shareScore, conversationId, onNewConversation }: VerdictCardProps) {
  const isDenied = verdict.type === "denied";
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const createVerdictCard = useMutation(api.shareCards.createVerdictCard);

  const itemLabel = item
    ? `: ${item}${estimatedPrice ? ` ($${estimatedPrice.toLocaleString()})` : ""}`
    : "";

  const handleShare = useCallback(async () => {
    if (!conversationId) return;

    setIsCreating(true);
    try {
      const token = await createVerdictCard({ conversationId });
      setShareToken(token);
      setShareModalOpen(true);
    } catch (error) {
      console.error("Failed to create share card:", error);
    } finally {
      setIsCreating(false);
    }
  }, [conversationId, createVerdictCard]);

  const cardData: VerdictCardData = {
    verdict: verdict.type,
    item: item ?? "Unknown item",
    estimatedPrice,
    category,
    verdictSummary,
    shareScore,
  };

  return (
    <>
      <div
        className={`text-center p-5 rounded-xl mt-2 mb-6 border-[1.5px] ${
          isDenied
            ? "animate-verdict-denied border-denied bg-[rgba(198,90,46,0.08)]"
            : "animate-verdict-in border-approved bg-[rgba(90,138,94,0.08)]"
        }`}
      >
        <div
          className={`text-[0.8rem] font-bold uppercase tracking-[0.12em] mb-2 ${
            isDenied ? "text-denied" : "text-approved"
          }`}
        >
          CASE CLOSED — {isDenied ? "DENIED" : "APPROVED"}<span className="capitalize">{itemLabel}</span>
        </div>
        <p className="text-[0.9rem] italic text-text-secondary mb-4">
          {verdictSummary
            ? verdictSummary
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
          cardType="verdict"
          cardData={cardData}
        />
      )}
    </>
  );
}

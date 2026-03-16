"use client";

import { VerdictShareCard } from "@/components/share/VerdictShareCard";
import type { VerdictCardData } from "@/lib/cards/types";

type CardData = {
  cardType: string;
  data: any;
  ogImageUrl?: string;
  downloadImageUrl?: string;
  createdAt: number;
} | null;

export function CardPageClient({
  token,
  initialCard,
}: {
  token: string;
  initialCard: CardData;
}) {
  const card = initialCard;

  if (!card) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-bg text-text-secondary text-sm">
        Not found
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-8" style={{ background: "#110F0D" }}>
      {/* Card display */}
      <div className="w-full max-w-[480px]" style={{ aspectRatio: "4/5" }}>
        {card.cardType === "verdict" && <VerdictShareCard data={card.data as VerdictCardData} />}
      </div>

      {/* CTA */}
      <a
        href="/"
        className="mt-8 rounded-[10px] bg-accent px-6 py-3 text-sm font-semibold text-user-text hover:bg-accent-hover active:scale-[0.97] transition-transform"
      >
        Try AskHank
      </a>
    </div>
  );
}

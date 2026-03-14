"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { VerdictShareCard } from "@/components/share/VerdictShareCard";
import type { VerdictCardData } from "@/lib/cards/types";

export function CardPageClient({ token }: { token: string }) {
  const card = useQuery(api.shareCards.getByToken, { token });

  if (card === undefined) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-bg text-text-secondary text-sm">
        Loading...
      </div>
    );
  }

  if (card === null) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-bg text-text-secondary text-sm">
        Not found
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4 py-8">
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

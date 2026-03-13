"use client";

import { useEffect, useState } from "react";
import { X, Coins, Loader2 } from "lucide-react";
import { useQuery } from "convex/react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CREDIT_PACKS, type PackId } from "../../convex/lib/credits";

const PACKS: { id: PackId; credits: number; price: string; label: string; highlight?: boolean }[] = [
  { id: "small", credits: CREDIT_PACKS.small.credits, price: CREDIT_PACKS.small.priceLabel, label: "Starter" },
  { id: "medium", credits: CREDIT_PACKS.medium.credits, price: CREDIT_PACKS.medium.priceLabel, label: "Popular", highlight: true },
  { id: "large", credits: CREDIT_PACKS.large.credits, price: CREDIT_PACKS.large.priceLabel, label: "Best Value" },
];

interface CreditsModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreditsModal({ open, onClose }: CreditsModalProps) {
  const credits = useQuery(api.credits.getBalance);
  const createCheckout = useAction(api.stripe.createCheckoutSession);
  const [loadingPack, setLoadingPack] = useState<string | null>(null);

  // Escape key closes
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const handlePurchase = async (packId: PackId) => {
    setLoadingPack(packId);
    try {
      const { url } = await createCheckout({ packId });
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Checkout failed:", error);
      setLoadingPack(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] rounded-3xl border border-border bg-bg-card shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div>
            <h3 className="text-lg font-bold text-text">Get Credits</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              1 credit = 1 message to Hank
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-surface hover:text-text"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current balance */}
        <div className="mx-6 mt-3 flex items-center gap-2.5 rounded-xl bg-bg-surface px-4 py-3">
          <Coins size={18} className={credits?.balance === 0 ? "text-red-400" : "text-accent"} />
          <span className="text-sm font-semibold text-text">
            {credits?.balance ?? 0} credits remaining
          </span>
        </div>

        {/* Pack options */}
        <div className="px-6 py-5 space-y-3">
          {PACKS.map((pack) => (
            <button
              key={pack.id}
              onClick={() => handlePurchase(pack.id)}
              disabled={loadingPack !== null}
              className={`relative flex w-full items-center justify-between rounded-2xl border px-5 py-4 transition-colors active:scale-[0.98] ${
                pack.highlight
                  ? "border-accent/50 bg-accent/5 hover:bg-accent/10"
                  : "border-border bg-bg-surface hover:bg-bg-surface/80"
              } ${loadingPack !== null ? "opacity-60 pointer-events-none" : ""}`}
            >
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-text">{pack.credits} credits</span>
                  {pack.highlight && (
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                      Popular
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-secondary mt-0.5">{pack.label}</div>
              </div>
              <div className="flex items-center gap-2">
                {loadingPack === pack.id ? (
                  <Loader2 size={16} className="animate-spin text-accent" />
                ) : (
                  <span className="text-base font-bold text-accent">{pack.price}</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Accent bottom bar */}
        <div className="h-1 w-full bg-gradient-to-r from-accent/50 via-accent to-accent/50" />
      </div>
    </div>
  );
}

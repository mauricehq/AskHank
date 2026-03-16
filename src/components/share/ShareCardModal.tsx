"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Download, Share2, Check, ExternalLink, Loader2 } from "lucide-react";
import { VerdictShareCard } from "./VerdictShareCard";
import { shareUrl } from "@/lib/cards/shareUrl";
import type { VerdictCardData } from "@/lib/cards/types";
import type { CardType } from "@/lib/cards/types";

interface ShareCardModalProps {
  open: boolean;
  onClose: () => void;
  token: string;
  cardType: CardType;
  cardData: VerdictCardData;
}

export function ShareCardModal({ open, onClose, token, cardType, cardData }: ShareCardModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"share" | "download" | null>(null);
  const [shareStatus, setShareStatus] = useState<"shared" | "copied" | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<"downloaded" | null>(null);
  // Two-step download: image URL cached after generation, downloaded on second tap
  // This fixes iOS Safari blocking downloads after async operations
  const [downloadImageUrl, setDownloadImageUrl] = useState<string | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setError(null);
      setPendingAction(null);
      setShareStatus(null);
      setDownloadStatus(null);
      setDownloadImageUrl(null);
    }
  }, [open]);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const generateImage = useCallback(
    async (format: "og" | "download"): Promise<string | null> => {
      try {
        const res = await fetch(`/api/card-images/${cardType}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, format }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to generate image");
        }

        const { imageUrl } = await res.json();
        return imageUrl;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate image");
        return null;
      }
    },
    [cardType, token]
  );

  const cardUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/card/${token}`
      : `/card/${token}`;

  const handleShareLink = useCallback(async () => {
    if (pendingAction) return;

    setPendingAction("share");
    setError(null);

    try {
      // Copy URL immediately (before user gesture context expires)
      const result = await shareUrl(cardUrl, `AskHank verdict: ${cardData.item}`);
      setShareStatus(result === "shared" ? "shared" : result === "copied" ? "copied" : null);
      if (result !== "error") {
        setTimeout(() => setShareStatus(null), 2000);
      }

      // Generate OG image in background (for future social media previews)
      generateImage("og").catch(console.error);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Failed to share:", err);
        setError(err instanceof Error ? err.message : "Failed to share");
      }
    } finally {
      setPendingAction(null);
    }
  }, [pendingAction, cardUrl, cardData.item, generateImage]);

  const handleDownload = useCallback(async () => {
    // Step 2: If image is ready, download immediately (fresh user gesture — iOS safe)
    if (downloadImageUrl) {
      try {
        const slug = cardData.item.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        await downloadFromUrl(downloadImageUrl, `askhank-${slug}.jpg`);
        setDownloadStatus("downloaded");
        setTimeout(() => setDownloadStatus(null), 2000);
      } catch (err) {
        console.error("Failed to download:", err);
        setError(err instanceof Error ? err.message : "Failed to save image");
      }
      return;
    }

    // Step 1: Generate the image (button will change to "Save Image" when ready)
    if (pendingAction) return;

    setPendingAction("download");
    setError(null);

    try {
      const imageUrl = await generateImage("download");
      if (imageUrl) {
        // Cache URL — button will now show "Save Image"
        setDownloadImageUrl(imageUrl);
      }
    } catch (err) {
      console.error("Failed to generate image:", err);
      setError(err instanceof Error ? err.message : "Failed to generate image");
    } finally {
      setPendingAction(null);
    }
  }, [downloadImageUrl, pendingAction, generateImage, token]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const isShareLoading = pendingAction === "share";
  const isDownloadLoading = pendingAction === "download";

  return createPortal(
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      {/* Scrollable content area with centering */}
      <div className="min-h-[100dvh] flex items-center justify-center p-4 py-8">
        <div className="relative w-full max-w-md sm:max-w-lg flex flex-col items-center animate-in zoom-in-95 duration-300">
          {/* Card preview - aspect-[4/5] required for container queries to work */}
          <div className="relative w-full aspect-[4/5]">
            <VerdictShareCard data={cardData} />
          </div>

          {/* Error State */}
          {error && (
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-red-900/20 border border-red-800/50 rounded-2xl w-full">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Action Buttons - z-20 ensures buttons render above card's massive shadow */}
          <div className="relative z-20 flex gap-3 sm:gap-4 mt-5 sm:mt-8 w-full animate-in slide-in-from-bottom-4 duration-500 delay-150">
            <button
              onClick={handleShareLink}
              disabled={pendingAction !== null}
              className="group/share flex-1 flex items-center justify-center gap-2 py-4 sm:py-5 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl text-white font-black text-[11px] uppercase tracking-widest hover:bg-white/10 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
            >
              {isShareLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : shareStatus ? (
                <>
                  <Check className="w-4 h-4 text-[#D4673A]" />
                  <span className="text-[#D4673A]">{shareStatus === "shared" ? "Shared" : "Copied"}</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 group-hover/share:rotate-12 transition-transform" />
                  Copy Link
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              disabled={pendingAction !== null}
              className="group/dl flex-1 flex items-center justify-center gap-2 py-4 sm:py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
              style={{
                background: "#D4673A",
                color: "#1A1714",
                boxShadow: "0 20px 25px -5px rgba(212, 103, 58, 0.2)",
              }}
            >
              {isDownloadLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : downloadStatus === "downloaded" ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved
                </>
              ) : downloadImageUrl ? (
                <>
                  <Download className="w-4 h-4 group-hover/dl:translate-y-0.5 transition-transform" />
                  Save Image
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 group-hover/dl:translate-y-0.5 transition-transform" />
                  Download Image
                </>
              )}
            </button>
          </div>

          {/* Helper Text */}
          <p className="mt-3 sm:mt-4 text-center text-[10px] text-zinc-500 uppercase tracking-widest">
            <span className="text-zinc-400">Image</span> for Reddit, Instagram
            {" \u2022 "}
            <span className="text-zinc-400">Link</span> for Twitter, iMessage
          </p>

          {/* View Link - show after link shared */}
          {shareStatus !== null || downloadImageUrl ? (
            <a
              href={cardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest animate-in fade-in duration-300"
            >
              <ExternalLink className="w-3 h-3" />
              View card page
            </a>
          ) : null}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="mt-6 sm:mt-10 p-3 bg-zinc-900 border border-white/10 rounded-full hover:scale-110 transition-all shadow-lg"
          >
            <X className="w-6 h-6 text-zinc-400" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Download an image from a URL
 */
async function downloadFromUrl(url: string, filename: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  const response = await fetch(url, { signal: controller.signal });
  clearTimeout(timeout);
  if (!response.ok) throw new Error("Failed to fetch image");
  const blob = await response.blob();

  // Mobile: use Web Share API for native "Save to Photos" experience
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile && navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: "image/jpeg" });
    if (navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] });
      return;
    }
  }

  // Desktop: direct blob download
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}

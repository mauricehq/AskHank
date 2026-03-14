"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
        await downloadFromUrl(downloadImageUrl, `askhank-${token}.png`);
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-[400px] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card preview */}
        <div
          className="w-full rounded-xl overflow-hidden"
          style={{ aspectRatio: "4/5" }}
        >
          <VerdictShareCard data={cardData} />
        </div>

        {/* Error */}
        {error && (
          <div className="mt-3 p-3 bg-red-950/40 border border-red-800/50 rounded-xl">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleShareLink}
            disabled={pendingAction !== null}
            className="flex-1 rounded-[10px] border border-accent text-accent px-4 py-2.5 text-sm font-semibold hover:bg-accent-soft disabled:opacity-50 transition-colors"
          >
            {isShareLoading
              ? "..."
              : shareStatus === "copied"
                ? "Copied!"
                : shareStatus === "shared"
                  ? "Shared!"
                  : "Copy link"}
          </button>
          <button
            onClick={handleDownload}
            disabled={pendingAction !== null}
            className="flex-1 rounded-[10px] bg-accent text-user-text px-4 py-2.5 text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 active:scale-[0.97] transition-all"
          >
            {isDownloadLoading
              ? "Generating..."
              : downloadStatus === "downloaded"
                ? "Saved!"
                : downloadImageUrl
                  ? "Save image"
                  : "Download PNG"}
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-bg-surface border border-border flex items-center justify-center text-text-secondary hover:text-text transition-colors"
        >
          &times;
        </button>
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
    const file = new File([blob], filename, { type: "image/png" });
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

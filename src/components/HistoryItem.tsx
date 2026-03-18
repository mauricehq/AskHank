"use client";

import { useEffect, useRef } from "react";
import { Check, MessageCircle, Trash2, X } from "lucide-react";
import { motion, useMotionValue, useTransform, animate, type PanInfo } from "framer-motion";

interface HistoryItemProps {
  name: string;
  verdict?: "denied" | "approved";
  timeAgo: string;
  estimatedPrice?: number;
  isActive?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  /** ID of the item whose swipe is currently open (only one at a time). */
  swipeOpenId?: string | null;
  /** This item's unique ID for swipe tracking. */
  itemId?: string;
  /** Callback to set which item's swipe is open (null = all closed). */
  onSwipeOpen?: (id: string | null) => void;
}

const DELETE_W = 72;
const SNAP_THRESHOLD = DELETE_W * 0.4;
const FAST_SWIPE_V = 500;

const spring = { type: "spring" as const, stiffness: 500, damping: 40 };
const exitSpring = { type: "spring" as const, stiffness: 300, damping: 35 };

export function HistoryItem({
  name,
  verdict,
  timeAgo,
  estimatedPrice,
  isActive,
  onClick,
  onDelete,
  swipeOpenId,
  itemId,
  onSwipeOpen,
}: HistoryItemProps) {
  const isDenied = verdict === "denied";
  const isApproved = verdict === "approved";
  const x = useMotionValue(0);
  const dragging = useRef(false);
  const isOpen = swipeOpenId === itemId;

  // Close when a different item is swiped open
  useEffect(() => {
    if (!isOpen && x.get() < 0) animate(x, 0, spring);
  }, [swipeOpenId]);

  // Reset on active-item change
  useEffect(() => {
    if (x.get() !== 0) animate(x, 0, spring);
  }, [isActive]);

  // Delete area stretches from the right edge (iOS-style)
  const bgW = useTransform(x, (v) => Math.max(-v, 0));
  const iconScale = useTransform(x, [-DELETE_W * 2, -DELETE_W, 0], [1.3, 1, 0.5]);

  function handleDragEnd(_: any, info: PanInfo) {
    const velocity = info.velocity.x;
    const pos = x.get();

    // Fast swipe or dragged very far → delete immediately
    if (velocity < -FAST_SWIPE_V || pos < -DELETE_W * 2.2) {
      animate(x, -500, exitSpring);
      onDelete?.();
      onSwipeOpen?.(null);
      return;
    }

    // Past snap threshold → reveal delete button
    if (pos < -SNAP_THRESHOLD) {
      animate(x, -DELETE_W, spring);
      onSwipeOpen?.(itemId ?? null);
    } else {
      // Snap closed
      animate(x, 0, spring);
      if (isOpen) onSwipeOpen?.(null);
    }

    requestAnimationFrame(() => {
      dragging.current = false;
    });
  }

  function handleClick() {
    if (dragging.current) return;
    // If swiped open, close instead of navigating
    if (x.get() < -5) {
      animate(x, 0, spring);
      onSwipeOpen?.(null);
      return;
    }
    onClick?.();
  }

  function triggerDelete(e: React.MouseEvent) {
    e.stopPropagation();
    animate(x, -500, exitSpring);
    onDelete?.();
    onSwipeOpen?.(null);
  }

  return (
    <div className="relative overflow-hidden rounded-[10px]">
      {/* Red delete zone (sits behind draggable content) */}
      {onDelete && (
        <motion.div
          className="absolute inset-y-0 right-0 flex items-center justify-center bg-denied"
          style={{ width: bgW }}
        >
          <motion.button
            onClick={triggerDelete}
            className="flex h-full w-full items-center justify-center text-white"
            style={{ scale: iconScale }}
          >
            <div className="flex flex-col items-center gap-0.5">
              <Trash2 size={16} strokeWidth={2.5} />
              <span className="text-[10px] font-semibold">Delete</span>
            </div>
          </motion.button>
        </motion.div>
      )}

      {/* Draggable content layer */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -DELETE_W, right: 0 }}
        dragElastic={{ left: 0.25, right: 0 }}
        style={{ x, touchAction: "pan-y" }}
        onDragStart={() => {
          dragging.current = true;
        }}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        className={`relative group flex w-full items-center gap-3 px-3 py-2.5 text-left cursor-pointer select-none bg-bg-card ${
          isActive
            ? "border-l-[3px] border-accent !bg-bg-surface"
            : "hover:bg-bg-surface transition-colors"
        }`}
      >
        {/* Verdict icon */}
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            isDenied
              ? "bg-denied/10 text-denied"
              : isApproved
                ? "bg-approved/10 text-approved"
                : "bg-text-secondary/10 text-text-secondary"
          }`}
        >
          {isDenied ? (
            <X size={14} strokeWidth={2.5} />
          ) : isApproved ? (
            <Check size={14} strokeWidth={2.5} />
          ) : (
            <MessageCircle size={14} strokeWidth={2.5} />
          )}
        </div>

        {/* Name + meta */}
        <div className="min-w-0 flex-1">
          <div className="capitalize truncate text-[0.85rem] font-bold text-text">{name}</div>
          <div className="text-[0.7rem] text-text-secondary">
            {estimatedPrice && estimatedPrice > 0 && (
              <>
                <span className="font-semibold">${estimatedPrice.toLocaleString()}</span> ·{" "}
              </>
            )}
            {timeAgo}
          </div>
        </div>

        {/* Verdict badge — hides on hover (desktop only) */}
        {verdict && (
          <span
            className={`shrink-0 rounded-md px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide group-hover:hidden ${
              isDenied ? "bg-denied/10 text-denied" : "bg-approved/10 text-approved"
            }`}
          >
            {verdict}
          </span>
        )}

        {/* Trash icon — desktop hover only */}
        {onDelete && (
          <div
            role="button"
            aria-label="Delete conversation"
            className="shrink-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto hidden group-hover:flex"
            onClick={triggerDelete}
          >
            <Trash2 size={14} className="text-text-secondary hover:text-denied" />
          </div>
        )}
      </motion.div>
    </div>
  );
}

"use client";

import { ChevronLeft, Plus, Settings, Shield, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { UserButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUserAccess } from "@/hooks/useUserAccess";
import { useCountUp } from "@/hooks/useCountUp";
import { HistoryItem } from "./HistoryItem";
import type { Id } from "../../convex/_generated/dataModel";

function formatRelativeTime(timestamp: number): string {
  const diff = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(diff / 604800000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (weeks === 1) return "1 week ago";
  return `${weeks} weeks ago`;
}

interface SidebarProps {
  isOpen: boolean;
  isDesktop: boolean;
  onClose: () => void;
  onToggle: () => void;
  onNewConversation?: () => void;
  onSelectConversation?: (id: Id<"conversations">) => void;
  activeConversationId?: Id<"conversations"> | null;
  onOpenAdmin?: () => void;
  onOpenSettings?: () => void;
  onOpenStats?: () => void;
  onDeleteConversation?: (id: Id<"conversations">) => void;
}

export function Sidebar({ isOpen, isDesktop, onClose, onToggle, onNewConversation, onSelectConversation, activeConversationId, onOpenAdmin, onOpenSettings, onOpenStats, onDeleteConversation }: SidebarProps) {
  const user = useQuery(api.users.currentUser);
  const history = useQuery(api.conversations.listForUser);
  const deleteConversation = useMutation(api.conversations.deleteConversation);
  const { canAccessAdminPanel } = useUserAccess();
  const displayName = user?.displayName ?? user?.email ?? "";

  const sidebarContent = (
    <div className="flex h-full w-[280px] flex-col">
      {/* Header */}
      <div className="flex h-[60px] shrink-0 items-center justify-between px-4">
        <span className="text-base font-bold tracking-tight text-text">
          Ask <span className="text-accent">Hank</span>
        </span>
        <button
          onClick={isDesktop ? onToggle : onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-surface hover:text-text"
          aria-label={isDesktop ? "Collapse sidebar" : "Close menu"}
        >
          {isDesktop ? <ChevronLeft size={18} /> : <X size={18} />}
        </button>
      </div>

      {/* New conversation button */}
      <div className="px-3 pb-3">
        <button
          onClick={() => {
            if (!isDesktop) onClose();
            onNewConversation?.();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-accent px-4 py-2.5 text-sm font-semibold text-user-text hover:bg-accent-hover active:scale-[0.97]"
        >
          <Plus size={16} />
          New conversation
        </button>
      </div>

      {/* History list */}
      <div className="flex-1 overflow-y-auto px-2">
        {history === undefined ? (
          <div className="space-y-2 px-3 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-[10px] px-3 py-2.5">
                <div className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-bg-surface" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-3/4 animate-pulse rounded bg-bg-surface" />
                  <div className="h-2.5 w-1/3 animate-pulse rounded bg-bg-surface" />
                </div>
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-text-secondary">
            No conversations yet
          </div>
        ) : (
          history.map((item) => (
            <HistoryItem
              key={item._id}
              name={item.title}
              verdict={item.verdict}
              estimatedPrice={item.estimatedPrice}
              timeAgo={formatRelativeTime(item.createdAt)}
              isActive={activeConversationId === item._id}
              onClick={() => {
                if (!isDesktop) onClose();
                onSelectConversation?.(item._id);
              }}
              onDelete={async () => {
                try {
                  await deleteConversation({ conversationId: item._id });
                  onDeleteConversation?.(item._id);
                } catch {
                  // Mutation failed — Convex shows error toast, list stays unchanged
                }
              }}
            />
          ))
        )}
      </div>

      {/* Stats */}
      <SidebarStats
        user={user}
        history={history}
        isDesktop={isDesktop}
        onClose={onClose}
        onOpenStats={onOpenStats}
      />

      {/* Footer */}
      <div className="shrink-0 border-t border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <UserButton />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-text">{displayName}</div>
          </div>
          {canAccessAdminPanel && (
            <button
              onClick={() => {
                if (!isDesktop) onClose();
                onOpenAdmin?.();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-surface hover:text-text"
              aria-label="Admin"
            >
              <Shield size={16} />
            </button>
          )}
          <ThemeToggle size="sm" />
          <button
            onClick={() => {
              if (!isDesktop) onClose();
              onOpenSettings?.();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-surface hover:text-text"
            aria-label="Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  // Desktop: static panel with width transition
  if (isDesktop) {
    return (
      <aside
        className="hidden h-full shrink-0 flex-col overflow-hidden border-r border-border bg-bg-card transition-[width] duration-[250ms] ease-in-out md:flex"
        style={{ width: isOpen ? 280 : 0 }}
      >
        {sidebarContent}
      </aside>
    );
  }

  // Mobile: overlay drawer
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-[250ms] ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-bg-card shadow-lg transition-transform ${
          isOpen
            ? "translate-x-0 duration-[250ms] ease-out"
            : "-translate-x-full duration-200 ease-in"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

function SidebarStats({
  user,
  history,
  isDesktop,
  onClose,
  onOpenStats,
}: {
  user: { savedTotal?: number; incomeAmount?: number; incomeType?: string } | undefined | null;
  history: { verdict?: string }[] | undefined;
  isDesktop: boolean;
  onClose: () => void;
  onOpenStats?: () => void;
}) {
  const deniedCount = history?.filter((c) => c.verdict === "denied").length ?? 0;
  const savedTotal = user?.savedTotal ?? 0;

  let hoursSaved: number | null = null;
  if (savedTotal > 0 && user?.incomeAmount && user?.incomeType) {
    const grossHourly = user.incomeType === "annual" ? user.incomeAmount / 2080 : user.incomeAmount;
    const netHourly = grossHourly * 0.75;
    if (netHourly > 0) {
      hoursSaved = Math.round((savedTotal / netHourly) * 10) / 10;
    }
  }

  const animatedSaved = useCountUp(savedTotal);
  const rightValue = hoursSaved !== null
    ? (hoursSaved >= 16 ? Math.round((hoursSaved / 8) * 10) / 10 : hoursSaved)
    : deniedCount;
  const animatedRight = useCountUp(rightValue);

  const formatRight = hoursSaved !== null
    ? (v: number) => (Math.round(v * 10) / 10).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : (v: number) => Math.round(v).toLocaleString();

  return (
    <div className="shrink-0 px-2 pb-3">
      <button
        onClick={() => {
          if (!isDesktop) onClose();
          onOpenStats?.();
        }}
        className="flex w-full cursor-pointer rounded-[10px] bg-bg-surface py-1 transition-shadow hover:ring-1 hover:ring-border">
        <div className="flex-1 py-3.5 text-center">
          <div className="text-[22px] font-bold leading-none tracking-tight text-accent">
            ${Math.round(animatedSaved).toLocaleString()}
          </div>
          <div className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-text-secondary">
            saved
          </div>
        </div>
        <div className="border-l border-border flex-1 py-3.5 text-center">
          <div className="text-[22px] font-bold leading-none tracking-tight text-accent">
            {formatRight(animatedRight)}
          </div>
          <div className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-text-secondary">
            {hoursSaved !== null ? (hoursSaved >= 16 ? "days saved" : "hours saved") : "resisted"}
          </div>
        </div>
      </button>
    </div>
  );
}

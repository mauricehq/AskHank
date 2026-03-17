"use client";

import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Coins, Gavel, Plus, Search, Settings, Shield, TrendingUp, X } from "lucide-react";
import { motion } from "framer-motion";
import { cascade } from "@/lib/motion";
import { ThemeToggle } from "./ThemeToggle";
import { UserButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUserAccess } from "@/hooks/useUserAccess";
import { useCountUp } from "@/hooks/useCountUp";
import { HistoryItem } from "./HistoryItem";
import { useRouter, useParams } from "next/navigation";
import { useAppLayout } from "./AppLayoutContext";
import type { Id } from "../../convex/_generated/dataModel";
import Link from "next/link";

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
}

export function Sidebar({ isOpen, isDesktop, onClose, onToggle }: SidebarProps) {
  const user = useQuery(api.users.currentUser);
  const history = useQuery(api.conversations.listForUser);
  const deleteConversation = useMutation(api.conversations.deleteConversation);
  const credits = useQuery(api.credits.getBalance);
  const { canAccessAdminPanel } = useUserAccess();
  const displayName = user?.displayName ?? user?.email ?? "";

  const router = useRouter();
  const params = useParams();
  const { openCreditsModal } = useAppLayout();

  const activeConversationId = params.id as Id<"conversations"> | undefined;

  const [searchQuery, setSearchQuery] = useState("");

  const filteredHistory = history?.filter((item) =>
    searchQuery === "" || item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sidebarContent = (
    <div className="flex h-full w-[280px] flex-col">
      {/* Header */}
      <div className="flex h-[60px] shrink-0 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <img src="/AskHankIcon.svg" alt="" width={22} height={22} />
          <span className="text-base font-bold tracking-tight text-text">
            Ask <span className="text-accent">Hank</span>
          </span>
        </Link>
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
            router.push("/conversations/new");
          }}
          className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-text-secondary hover:bg-bg-surface hover:text-text transition-colors"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Plus size={16} />
          </span>
          New conversation
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search conversations…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border-[1.5px] border-border bg-input-bg py-2 pl-9 pr-8 text-sm text-text placeholder:text-text-secondary/60 focus:border-accent focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Verdict History link */}
      <div className="px-3 pb-1">
        <button
          onClick={() => {
            if (!isDesktop) onClose();
            router.push("/verdicts");
          }}
          className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-sm font-medium text-text-secondary hover:bg-bg-surface hover:text-text transition-colors"
        >
          <Gavel size={16} />
          <span className="flex-1 text-left">Verdict History</span>
          <ChevronRight size={14} className="text-text-secondary/50" />
        </button>
      </div>

      {/* RECENTS label */}
      <div className="px-3 pt-3 pb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
          Recents
        </span>
      </div>

      {/* History list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2">
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
        ) : filteredHistory!.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-text-secondary">
            No matches
          </div>
        ) : (
          <div key={searchQuery || "__all"} className="animate-fade-in">
            {filteredHistory!.map((item, i) => (
              <motion.div key={item._id} {...cascade(i, { maxIndex: 8 })}>
                <HistoryItem
                  name={item.title}
                  verdict={item.verdict}
                  estimatedPrice={item.estimatedPrice}
                  timeAgo={formatRelativeTime(item.createdAt)}
                  isActive={activeConversationId === item._id}
                  onClick={() => {
                    if (!isDesktop) onClose();
                    router.push(`/conversations/${item._id}`);
                  }}
                  onDelete={async () => {
                    try {
                      await deleteConversation({ conversationId: item._id });
                      // If we deleted the active conversation, go to empty state
                      if (item._id === activeConversationId) {
                        router.push("/conversations");
                      }
                    } catch {
                      // Mutation failed — Convex shows error toast, list stays unchanged
                    }
                  }}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Credits + Stats */}
      <div className="shrink-0 px-2 pb-3 space-y-2">
        {/* Credit balance */}
        {credits !== undefined && (
          <button
            onClick={() => {
              if (!isDesktop) onClose();
              openCreditsModal();
            }}
            className="flex w-full items-center gap-2.5 rounded-[10px] bg-bg-surface px-3.5 py-3 text-left hover:bg-bg-surface/80 transition-colors"
          >
            <Coins size={16} className="text-text-secondary" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold tracking-tight text-text">
                {credits.balance} credits
              </div>
            </div>
            <ChevronRight size={14} className="text-text-secondary/50" />
          </button>
        )}
      </div>

      {/* Stats */}
      <SidebarStats
        user={user}
        history={history}
        isDesktop={isDesktop}
        onClose={onClose}
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
                router.push("/admin");
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
              router.push("/settings");
            }}
            className="group flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-surface hover:text-text"
            aria-label="Settings"
          >
            <Settings size={16} className="transition-transform duration-200 group-hover:rotate-90" />
          </button>
        </div>
      </div>
    </div>
  );

  // Desktop: static panel with width transition
  if (isDesktop) {
    return (
      <div className="relative hidden shrink-0 md:flex">
        <aside
          className="flex h-full flex-col overflow-hidden border-r border-border bg-bg-card transition-[width] duration-[250ms] ease-in-out"
          style={{ width: isOpen ? 280 : 48 }}
        >
          {isOpen ? (
            sidebarContent
          ) : (
          <div className="flex h-full w-[48px] flex-col items-center">
            {/* Logo — expand trigger */}
            <button
              onClick={onToggle}
              className="flex h-[60px] w-full shrink-0 items-center justify-center"
              aria-label="Expand sidebar"
            >
              <img src="/AskHankIcon.svg" alt="" width={22} height={22} />
            </button>

            {/* Top actions */}
            <div className="flex flex-col items-center gap-1 py-1">
              {([
                { icon: <Plus size={16} />, label: "New conversation", accent: true, onClick: () => router.push("/conversations/new") },
                { icon: <Search size={16} />, label: "Search", onClick: onToggle },
                { icon: <Gavel size={16} />, label: "Verdict History", onClick: () => router.push("/verdicts") },
              ] as const).map((cfg, i) => (
                <div key={cfg.label} className="animate-fade-in opacity-0" style={{ animationDelay: `${250 + i * 40}ms`, animationFillMode: "both" }}>
                  <IconButton icon={cfg.icon} label={cfg.label} accent={"accent" in cfg} onClick={cfg.onClick} />
                </div>
              ))}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Bottom actions */}
            <div className="flex flex-col items-center gap-1 py-1">
              {([
                { icon: <Coins size={16} />, label: "Credits", onClick: openCreditsModal },
                { icon: <TrendingUp size={16} />, label: "Stats", onClick: () => router.push("/stats") },
              ] as const).map((cfg, i) => (
                <div key={cfg.label} className="animate-fade-in opacity-0" style={{ animationDelay: `${250 + (i + 3) * 40}ms`, animationFillMode: "both" }}>
                  <IconButton icon={cfg.icon} label={cfg.label} onClick={cfg.onClick} />
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex flex-col items-center gap-1 border-t border-border py-2.5 w-full">
              {canAccessAdminPanel && (
                <IconButton icon={<Shield size={16} />} label="Admin" onClick={() => router.push("/admin")} />
              )}
              <ThemeToggle size="sm" />
              <IconButton icon={<Settings size={16} />} label="Settings" onClick={() => router.push("/settings")} />
              <UserButton />
            </div>
          </div>
        )}
        </aside>

        {/* Floating expand chevron on sidebar edge */}
        {!isOpen && (
          <button
            onClick={onToggle}
            className="absolute -right-3 top-[18px] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-bg-card text-text-secondary shadow-sm transition-colors hover:bg-bg-surface hover:text-text"
            aria-label="Expand sidebar"
          >
            <ChevronRight size={14} />
          </button>
        )}
      </div>
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
}: {
  user: { savedTotal?: number; incomeAmount?: number; incomeType?: string } | undefined | null;
  history: { verdict?: string }[] | undefined;
  isDesktop: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
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
          router.push("/stats");
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

function IconButton({ icon, label, onClick, accent }: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center transition-colors ${
        accent
          ? "h-8 w-8 rounded-full bg-accent/15 text-accent hover:bg-accent/25"
          : "h-8 w-8 rounded-lg text-text-secondary hover:bg-bg-surface hover:text-text"
      }`}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}

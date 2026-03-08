"use client";

import { ChevronLeft, Plus, Settings, X } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { HistoryItem } from "./HistoryItem";

const MOCK_HISTORY = [
  { id: "1", name: "AirPods Max", verdict: "denied" as const, timeAgo: "3 days ago" },
  { id: "2", name: "Nike Dunk Low Retro", verdict: "denied" as const, timeAgo: "5 days ago" },
  { id: "3", name: "Winter Coat", verdict: "approved" as const, timeAgo: "1 week ago" },
  { id: "4", name: "Espresso Machine", verdict: "denied" as const, timeAgo: "2 weeks ago" },
];

interface SidebarProps {
  isOpen: boolean;
  isDesktop: boolean;
  onClose: () => void;
  onToggle: () => void;
}

export function Sidebar({ isOpen, isDesktop, onClose, onToggle }: SidebarProps) {
  const user = useQuery(api.users.currentUser);
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
        <button className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-accent px-4 py-2.5 text-sm font-semibold text-user-text hover:bg-accent-hover active:scale-[0.97]">
          <Plus size={16} />
          New conversation
        </button>
      </div>

      {/* History list */}
      <div className="flex-1 overflow-y-auto px-2">
        {MOCK_HISTORY.map((item) => (
          <HistoryItem
            key={item.id}
            name={item.name}
            verdict={item.verdict}
            timeAgo={item.timeAgo}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <UserButton />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-text">{displayName}</div>
          </div>
          <button
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

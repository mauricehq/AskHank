"use client";

import { useState, useMemo } from "react";
import { ArrowLeft, Check, ChevronRight, X } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { motion } from "framer-motion";
import { cascade } from "@/lib/motion";

type VerdictEntry = Doc<"verdictLedger">;

type Filter = "all" | "denied" | "approved";

interface VerdictHistoryProps {
  onBack: () => void;
}

export function VerdictHistory({ onBack }: VerdictHistoryProps) {
  const entries = useQuery(api.verdictLedger.listForUser);
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!entries) return [];
    const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt);
    if (filter === "all") return sorted;
    return sorted.filter((e) => e.verdict === filter);
  }, [entries, filter]);

  const groups = useMemo(() => groupByTime(filtered), [filtered]);

  const savedTotal = useMemo(() => {
    if (!entries) return 0;
    return entries
      .filter((e) => e.verdict === "denied" && e.estimatedPrice)
      .reduce((sum, e) => sum + (e.estimatedPrice ?? 0), 0);
  }, [entries]);

  const deniedCount = useMemo(
    () => entries?.filter((e) => e.verdict === "denied").length ?? 0,
    [entries],
  );
  const approvedCount = useMemo(
    () => entries?.filter((e) => e.verdict === "approved").length ?? 0,
    [entries],
  );

  if (entries === undefined) return null;

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 flex-col min-h-0">
        <Header onBack={onBack} />
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="text-center">
            <h2 className="text-lg font-bold text-text">No verdicts yet</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Start a conversation with Hank to see your purchase decisions
              here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <Header onBack={onBack} />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] px-4 py-5 md:px-6 md:py-8 space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              {...cascade(0)}
              className="rounded-xl bg-bg-surface p-5 text-center"
            >
              <div className="text-2xl font-bold tracking-tight text-accent">
                ${Math.round(savedTotal).toLocaleString()}
              </div>
              <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-text-secondary">
                saved
              </div>
            </motion.div>
            <motion.div
              {...cascade(1)}
              className="rounded-xl bg-bg-surface p-5 text-center"
            >
              <div className="text-sm font-semibold text-denied">
                {deniedCount} denied
              </div>
              <div className="mt-1 text-sm font-semibold text-approved">
                {approvedCount} approved
              </div>
            </motion.div>
          </div>

          {/* Filter Tabs */}
          <motion.div {...cascade(2)} className="flex gap-2">
            {(["all", "denied", "approved"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`rounded-[99px] px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
                  filter === tab
                    ? "bg-accent text-user-text"
                    : "bg-bg-surface text-text-secondary hover:text-text"
                }`}
              >
                {tab}
              </button>
            ))}
          </motion.div>

          {/* Time Groups */}
          {groups.map((group, gi) => {
            const isRecent =
              group.key === "this-week" || group.key === "this-month";
            const isOpen = isRecent || expanded.has(group.key);

            return (
              <motion.div key={group.key} {...cascade(3 + gi)}>
                {isRecent ? (
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-text-secondary">
                      {group.label}
                    </h3>
                  </div>
                ) : (
                  <button
                    onClick={() =>
                      setExpanded((prev) => {
                        const next = new Set(prev);
                        if (next.has(group.key)) next.delete(group.key);
                        else next.add(group.key);
                        return next;
                      })
                    }
                    className="flex w-full items-center gap-2 mb-2 cursor-pointer"
                  >
                    <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-text-secondary">
                      {group.label}
                    </h3>
                    <span className="text-xs text-text-secondary">
                      · {group.entries.length}{" "}
                      {group.entries.length === 1 ? "item" : "items"}
                    </span>
                    <ChevronRight
                      size={14}
                      className={`text-text-secondary transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                    />
                  </button>
                )}

                {isOpen && (
                  <div className="space-y-2">
                    {group.entries.map((entry) => (
                      <VerdictRow key={entry._id} entry={entry} />
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* Filtered empty state */}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-text-secondary">
              No {filter} verdicts
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <div className="shrink-0 border-b border-border px-4 py-3 md:px-6">
      <div className="mx-auto max-w-[720px]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-surface hover:text-text"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-bold tracking-tight text-text">
            Verdict History
          </h1>
        </div>
      </div>
    </div>
  );
}

function VerdictRow({ entry }: { entry: VerdictEntry }) {
  const isDenied = entry.verdict === "denied";

  return (
    <div className="flex items-start gap-3 rounded-xl bg-bg-surface p-4">
      {/* Icon badge */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          isDenied
            ? "bg-denied/10 text-denied"
            : "bg-approved/10 text-approved"
        }`}
      >
        {isDenied ? (
          <X size={14} strokeWidth={2.5} />
        ) : (
          <Check size={14} strokeWidth={2.5} />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="text-[0.9rem] font-bold capitalize truncate text-text">
          {entry.item}
        </div>
        {(entry.estimatedPrice || entry.category) && (
          <div className="text-[0.75rem] text-text-secondary">
            {entry.estimatedPrice != null && entry.estimatedPrice > 0 && (
              <span className="font-semibold">${entry.estimatedPrice.toLocaleString()}</span>
            )}
            {entry.estimatedPrice != null && entry.estimatedPrice > 0 && entry.category && (
              <> · </>
            )}
            {entry.category && (
              <span className="capitalize">{entry.category.replace(/_/g, " ")}</span>
            )}
          </div>
        )}
        {entry.verdictSummary && (
          <div className="mt-1 text-[0.8rem] italic text-text-secondary line-clamp-2">
            &ldquo;{entry.verdictSummary}&rdquo;
          </div>
        )}
      </div>

      {/* Verdict pill */}
      <span
        className={`shrink-0 rounded-md px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${
          isDenied
            ? "bg-denied/10 text-denied"
            : "bg-approved/10 text-approved"
        }`}
      >
        {entry.verdict}
      </span>
    </div>
  );
}

type TimeGroup = { label: string; key: string; entries: VerdictEntry[] };

function groupByTime(entries: VerdictEntry[]): TimeGroup[] {
  const now = new Date();

  // Start of week (Monday-based)
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0 offset
  startOfWeek.setDate(startOfWeek.getDate() - diff);
  startOfWeek.setHours(0, 0, 0, 0);

  // Start of month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const thisWeek: VerdictEntry[] = [];
  const thisMonth: VerdictEntry[] = [];
  const older = new Map<string, VerdictEntry[]>();

  for (const entry of entries) {
    const date = new Date(entry.createdAt);
    if (date >= startOfWeek) {
      thisWeek.push(entry);
    } else if (date >= startOfMonth) {
      thisMonth.push(entry);
    } else {
      const key = date.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
      const arr = older.get(key);
      if (arr) arr.push(entry);
      else older.set(key, [entry]);
    }
  }

  const groups: TimeGroup[] = [];
  if (thisWeek.length > 0)
    groups.push({ label: "This Week", key: "this-week", entries: thisWeek });
  if (thisMonth.length > 0)
    groups.push({
      label: "This Month",
      key: "this-month",
      entries: thisMonth,
    });
  for (const [label, groupEntries] of older) {
    groups.push({ label, key: label, entries: groupEntries });
  }

  return groups;
}

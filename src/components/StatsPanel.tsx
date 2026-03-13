"use client";

import { ArrowLeft, TrendingUp, MessageSquare, Flame, Trophy, Clock, ShieldCheck } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface StatsPanelProps {
  onBack: () => void;
  onOpenSettings: () => void;
}

export function StatsPanel({ onBack, onOpenSettings }: StatsPanelProps) {
  const stats = useQuery(api.stats.getStats);

  if (stats === undefined) return null;

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
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
              Your Stats
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] px-4 py-5 md:px-6 md:py-8 space-y-5">
          {/* Hero: Total Saved */}
          <div className="rounded-xl bg-bg-surface p-6 text-center">
            <div className="text-[40px] font-bold leading-none tracking-tight text-accent">
              ${stats.savedTotal.toLocaleString()}
            </div>
            <div className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-text-secondary">
              Total Saved
            </div>
            {stats.hoursSaved !== null ? (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-sm text-text-secondary">
                <Clock size={14} />
                <span>That&apos;s <span className="font-semibold text-text">{stats.hoursSaved >= 16 ? `${Math.round((stats.hoursSaved / 8) * 10) / 10} days` : `${stats.hoursSaved} ${stats.hoursSaved === 1 ? "hour" : "hours"}`}</span> of work</span>
              </div>
            ) : (
              <button
                onClick={onOpenSettings}
                className="mt-3 text-xs text-text-secondary hover:text-accent transition-colors"
              >
                Add your income in Settings to see hours saved
              </button>
            )}
          </div>

          {/* Overview grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<ShieldCheck size={16} />}
              value={String(stats.deniedCount)}
              label="Resisted"
            />
            <StatCard
              icon={<TrendingUp size={16} />}
              value={stats.resistanceRate !== null ? `${stats.resistanceRate}%` : "0%"}
              label="Resistance Rate"
            />
            <StatCard
              icon={<MessageSquare size={16} />}
              value={String(stats.totalConversations)}
              label="Conversations"
            />
            <StatCard
              icon={<Flame size={16} />}
              value={String(stats.currentStreak)}
              label="Resist Streak"
            />
          </div>

          {/* Biggest Save */}
          <div className="rounded-xl bg-bg-surface p-5">
            <div className="flex items-center gap-2 text-text-secondary mb-3">
              <Trophy size={16} />
              <span className="text-xs font-medium uppercase tracking-[0.12em]">
                Biggest Save
              </span>
            </div>
            {stats.biggestSave ? (
              <>
                <div className="text-2xl font-bold tracking-tight text-accent">
                  ${stats.biggestSave.amount.toLocaleString()}
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-sm text-text-secondary">
                  {stats.biggestSave.item && (
                    <span className="capitalize">{stats.biggestSave.item}</span>
                  )}
                  {stats.biggestSave.item && <span>&middot;</span>}
                  <span>{new Date(stats.biggestSave.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              </>
            ) : (
              <div className="text-2xl font-bold tracking-tight text-accent">$0</div>
            )}
          </div>

          {/* Category Breakdown */}
          <div className="rounded-xl bg-bg-surface p-5">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-text-secondary mb-4">
              Top Categories Saved
            </div>
            {stats.categories.length > 0 ? (
              <div className="space-y-3">
                {stats.categories.map((cat) => (
                  <CategoryBar
                    key={cat.name}
                    name={cat.name}
                    amount={cat.amount}
                    maxAmount={stats.categories[0].amount}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">
                No categories yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-bg-surface p-4 text-center">
      <div className="flex justify-center text-text-secondary mb-2">{icon}</div>
      <div className="text-xl font-bold tracking-tight text-text">{value}</div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-text-secondary">
        {label}
      </div>
    </div>
  );
}

function CategoryBar({
  name,
  amount,
  maxAmount,
}: {
  name: string;
  amount: number;
  maxAmount: number;
}) {
  const widthPercent = maxAmount > 0 ? Math.max(8, (amount / maxAmount) * 70) : 8;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-text capitalize">{name}</span>
        <span className="text-xs text-text-secondary">${amount.toLocaleString()}</span>
      </div>
      <div className="h-2 rounded-full bg-bg">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${widthPercent}%` }}
        />
      </div>
    </div>
  );
}

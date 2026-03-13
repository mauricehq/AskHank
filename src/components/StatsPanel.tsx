"use client";

import { ArrowLeft, TrendingUp, MessageSquare, Flame, Trophy } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface StatsPanelProps {
  onBack: () => void;
}

export function StatsPanel({ onBack }: StatsPanelProps) {
  const stats = useQuery(api.stats.getStats);

  if (stats === undefined) return null;

  const isEmpty = stats.totalConversations === 0;

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
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-text-secondary text-sm">
                No stats yet — start a conversation with Hank to see your data here.
              </p>
            </div>
          ) : (
            <>
              {/* Hero: Total Saved */}
              <div className="rounded-xl bg-bg-surface p-6 text-center">
                <div className="text-[40px] font-bold leading-none tracking-tight text-accent">
                  ${stats.savedTotal.toLocaleString()}
                </div>
                <div className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-text-secondary">
                  Total Saved
                </div>
              </div>

              {/* Overview row */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  icon={<TrendingUp size={16} />}
                  value={stats.resistanceRate !== null ? `${stats.resistanceRate}%` : "—"}
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
                  label="Deny Streak"
                />
              </div>

              {/* Biggest Save */}
              {stats.biggestSave !== null && (
                <div className="rounded-xl bg-bg-surface p-5">
                  <div className="flex items-center gap-2 text-text-secondary mb-3">
                    <Trophy size={16} />
                    <span className="text-xs font-medium uppercase tracking-[0.12em]">
                      Biggest Save
                    </span>
                  </div>
                  <div className="text-2xl font-bold tracking-tight text-accent">
                    ${stats.biggestSave.toLocaleString()}
                  </div>
                </div>
              )}

              {/* Category Breakdown */}
              {stats.categories.length > 0 && (
                <div className="rounded-xl bg-bg-surface p-5">
                  <div className="text-xs font-medium uppercase tracking-[0.12em] text-text-secondary mb-4">
                    Top Categories Denied
                  </div>
                  <div className="space-y-3">
                    {stats.categories.map((cat) => (
                      <CategoryBar
                        key={cat.name}
                        name={cat.name}
                        count={cat.count}
                        maxCount={stats.categories[0].count}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
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
  count,
  maxCount,
}: {
  name: string;
  count: number;
  maxCount: number;
}) {
  const widthPercent = Math.max(8, (count / maxCount) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-text capitalize">{name}</span>
        <span className="text-xs text-text-secondary">{count}</span>
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

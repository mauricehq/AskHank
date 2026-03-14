"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export function CreditManagement() {
  const users = useQuery(api.admin.listUsersWithCredits);
  const addCredits = useMutation(api.admin.adminAddCredits);
  const setBalance = useMutation(api.admin.adminSetBalance);
  const [error, setError] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, number>>({});

  if (users === undefined) {
    return (
      <div className="text-sm text-text-secondary">Loading credits...</div>
    );
  }

  const getAmount = (userId: string) => amounts[userId] ?? 30;

  const handleAddCredits = async (userId: Id<"users">) => {
    setError(null);
    try {
      await addCredits({ userId, amount: getAmount(userId) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add credits.");
    }
  };

  const handleReset = async (userId: Id<"users">) => {
    if (!confirm("Reset this user's balance to 0?")) return;
    setError(null);
    try {
      await setBalance({ userId, balance: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset balance.");
    }
  };

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-lg bg-denied/10 px-3 py-2 text-xs text-denied">
          {error}
        </div>
      )}
      <div className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
        {users.length} user{users.length !== 1 ? "s" : ""}
      </div>

      <div className="space-y-1">
        {users.map((user) => (
          <div
            key={user._id}
            className="flex items-center gap-3 rounded-[10px] border border-border bg-bg-card px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-text">
                {user.displayName || user.email}
              </div>
              {user.displayName && (
                <div className="truncate text-xs text-text-secondary">
                  {user.email}
                </div>
              )}
            </div>

            <div className="shrink-0 rounded-md bg-bg-surface px-2 py-1 text-xs font-semibold tabular-nums text-text">
              {user.balance}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <input
                type="number"
                min={1}
                value={getAmount(user._id)}
                onChange={(e) =>
                  setAmounts((prev) => ({
                    ...prev,
                    [user._id]: Math.max(1, parseInt(e.target.value) || 1),
                  }))
                }
                className="w-14 rounded-lg border border-border bg-bg-surface px-2 py-1 text-xs text-text outline-none focus:border-accent tabular-nums"
              />
              <button
                onClick={() => handleAddCredits(user._id)}
                className="rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-user-text hover:bg-accent/90 transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => handleReset(user._id)}
                className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-denied hover:text-denied transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { type UserRole, USER_ROLES } from "@/lib/roles";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function UserManagement() {
  const users = useQuery(api.admin.listUsers);
  const setRole = useMutation(api.admin.setUserRole);
  const currentUser = useQuery(api.users.currentUser);
  const [error, setError] = useState<string | null>(null);

  if (users === undefined) {
    return (
      <div className="text-sm text-text-secondary">Loading users...</div>
    );
  }

  const handleRoleChange = async (userId: Id<"users">, role: UserRole) => {
    setError(null);
    try {
      await setRole({ userId, role });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update role.");
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
        {users.map((user) => {
          const isSelf = currentUser?._id === user._id;
          return (
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

              <div className="text-xs text-text-secondary shrink-0 hidden sm:block">
                {formatDate(user._creationTime)}
              </div>

              <select
                value={user.role}
                onChange={(e) =>
                  handleRoleChange(user._id, e.target.value as UserRole)
                }
                disabled={isSelf}
                className={`shrink-0 rounded-lg border border-border bg-bg-surface px-2 py-1 text-xs font-medium text-text outline-none ${
                  isSelf
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer hover:border-accent"
                }`}
                title={isSelf ? "Cannot change your own role" : undefined}
              >
                {USER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

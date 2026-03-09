"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { UserRole } from "@/lib/roles";

export type { UserRole };

export function useUserAccess() {
  const user = useQuery(api.users.currentUser);

  const loading = user === undefined;
  const role: UserRole = user?.role ?? "normal";

  return {
    role,
    isAdmin: role === "admin",
    isInsider: role === "insider" || role === "admin",
    canAccessAdminPanel: role === "admin",
    loading,
  };
}

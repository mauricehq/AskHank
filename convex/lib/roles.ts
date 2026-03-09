import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { requireUser } from "./auth";
import type { UserRole } from "./roleConstants";

export type { UserRole };

export function getUserRole(user: Doc<"users">): UserRole {
  return user.role ?? "normal";
}

export async function requireAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (getUserRole(user) !== "admin") {
    throw new Error("Admin access required");
  }
  return user;
}

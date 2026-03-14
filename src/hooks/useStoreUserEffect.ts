"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";

const MAX_RETRIES = 3;
const BACKOFF_DELAYS = [1000, 2000, 3000];

function isTransientError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("fetch") ||
    // Generic errors (no auth keyword) are assumed transient
    (!message.includes("not authenticated") && !message.includes("authentication"))
  );
}

export function useStoreUserEffect() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const storeUser = useMutation(api.users.store);
  const [isStoring, setIsStoring] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const clearSessionError = useCallback(() => setSessionError(null), []);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    setIsStoring(true);
    setSessionError(null);

    async function attemptStore() {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          await storeUser({ timezone });
          if (!cancelled) setIsStoring(false);
          return; // success
        } catch (error) {
          if (cancelled) return;

          // Permanent error — stop immediately
          if (!isTransientError(error)) {
            setIsStoring(false);
            setSessionError("Your session could not be verified. Please sign in again.");
            return;
          }

          // Last attempt exhausted
          if (attempt === MAX_RETRIES - 1) {
            setIsStoring(false);
            setSessionError(
              "Unable to connect after multiple attempts. Please check your connection or sign in again."
            );
            return;
          }

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, BACKOFF_DELAYS[attempt]));
          if (cancelled) return;
        }
      }
    }

    attemptStore();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, storeUser]);

  return {
    isLoading: isLoading || !isAuthenticated || isStoring,
    sessionError,
    clearSessionError,
  };
}

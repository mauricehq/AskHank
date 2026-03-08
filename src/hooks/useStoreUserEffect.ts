"use client";

import { useEffect, useState } from "react";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useStoreUserEffect() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const storeUser = useMutation(api.users.store);
  const [isStoring, setIsStoring] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    setIsStoring(true);

    storeUser()
      .then(() => {
        if (!cancelled) setIsStoring(false);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Failed to store user:", error);
          setIsStoring(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, storeUser]);

  // Loading until: Convex receives JWT, user is authenticated, and user record is stored
  return isLoading || !isAuthenticated || isStoring;
}

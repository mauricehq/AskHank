"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ReplayScreen } from "@/components/ReplayScreen";

export function ReplayPageClient({ token }: { token: string }) {
  const cut = useQuery(api.replayCuts.getByToken, { token });

  if (cut === undefined) {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg text-text-secondary text-sm">
        Loading...
      </div>
    );
  }

  if (cut === null) {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg text-text-secondary text-sm">
        Not found
      </div>
    );
  }

  return <ReplayScreen cut={cut} />;
}

"use client";

import { useClerk } from "@clerk/nextjs";

interface SessionErrorBannerProps {
  sessionError: string;
  clearSessionError: () => void;
}

export function SessionErrorBanner({ sessionError, clearSessionError }: SessionErrorBannerProps) {
  const { signOut } = useClerk();

  return (
    <div className="mt-4 flex items-center gap-3 rounded-[10px] border border-accent bg-accent-soft px-4 py-3 text-sm text-text">
      <span className="flex-1">{sessionError}</span>
      <button
        onClick={async () => {
          await signOut();
          clearSessionError();
        }}
        className="shrink-0 rounded-[10px] bg-accent px-4 py-1.5 text-xs font-medium text-user-text hover:bg-accent-hover"
      >
        Sign In Again
      </button>
      <button
        onClick={clearSessionError}
        className="shrink-0 text-text-secondary hover:text-text"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

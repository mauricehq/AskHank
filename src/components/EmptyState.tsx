"use client";

interface EmptyStateProps {
  onStartChat: () => void;
  savedTotal?: number;
}

export function EmptyState({ onStartChat, savedTotal }: EmptyStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-[400px] text-center">
        <h2 className="text-lg font-semibold text-text">Thinking about buying something.</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Tell Hank. He will talk you out of it.
        </p>
        {savedTotal != null && savedTotal > 0 && (
          <p className="mt-3 text-sm font-semibold text-accent">
            Hank has saved you ${savedTotal.toLocaleString()}
          </p>
        )}
        <button
          onClick={onStartChat}
          className="mt-6 rounded-[10px] bg-accent px-6 py-2.5 text-sm font-semibold text-user-text hover:bg-accent-hover active:scale-[0.97]"
        >
          Talk to Hank
        </button>
      </div>
    </div>
  );
}

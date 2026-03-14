"use client";

import Link from "next/link";

export function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-[400px] text-center">
        <h2 className="text-lg font-semibold text-text">Thinking about buying something.</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Tell Hank. He will talk you out of it.
        </p>
        <Link
          href="/conversations/new"
          className="mt-6 inline-block rounded-[10px] bg-accent px-6 py-2.5 text-sm font-semibold text-user-text hover:bg-accent-hover active:scale-[0.97]"
        >
          Talk to Hank
        </Link>
      </div>
    </div>
  );
}

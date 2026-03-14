"use client";

import { Show, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";

export function FinalCTA() {
  return (
    <div className="py-24 md:py-32 px-6 text-center">
      <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
        Ask <span className="text-accent">Hank</span>
      </h2>
      <p className="mt-4 text-text-secondary text-base md:text-lg">
        Tell him what you want to buy.
      </p>
      <div className="mt-8">
        <Show when="signed-out">
          <SignUpButton mode="modal" forceRedirectUrl="/conversations">
            <button className="rounded-[10px] bg-accent px-6 py-2.5 text-sm font-medium text-user-text hover:bg-accent-hover transition-colors">
              Try it free
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <Link
            href="/conversations"
            className="rounded-[10px] bg-accent px-6 py-2.5 text-sm font-medium text-user-text hover:bg-accent-hover transition-colors"
          >
            Open Hank
          </Link>
        </Show>
      </div>
    </div>
  );
}

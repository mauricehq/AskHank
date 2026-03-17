"use client";

import { Show, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";

export function FinalCTA() {
  return (
    <div className="relative py-24 md:py-32 px-6 text-center overflow-hidden">
      {/* Accent glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[250px] bg-accent/6 blur-[100px] rounded-full pointer-events-none" />

      <h2 className="relative text-4xl md:text-5xl font-bold tracking-tight">
        You already know you{" "}
        <span className="text-accent">don&apos;t need it.</span>
      </h2>
      <p className="relative mt-4 text-text-secondary text-base md:text-lg">
        Hank just makes sure you don&apos;t buy it.
      </p>
      <div className="relative mt-8">
        <Show when="signed-out">
          <SignUpButton mode="modal" forceRedirectUrl="/conversations">
            <button className="rounded-[10px] bg-accent px-8 py-3 text-base font-medium text-user-text hover:bg-accent-hover transition-all active:scale-[0.97] hover:shadow-[0_0_30px_rgba(198,90,46,0.3)] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
              Try it free
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <Link
            href="/conversations"
            className="inline-block rounded-[10px] bg-accent px-8 py-3 text-base font-medium text-user-text hover:bg-accent-hover transition-all active:scale-[0.97] hover:shadow-[0_0_30px_rgba(198,90,46,0.3)] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            Open Hank
          </Link>
        </Show>
      </div>
    </div>
  );
}

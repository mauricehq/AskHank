"use client";

import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      {/* Accent glow behind headline */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-accent/6 blur-[100px] rounded-full pointer-events-none" />

      <h1 className="relative text-5xl md:text-7xl font-bold tracking-tight">
        About to buy something{" "}
        <span className="text-accent">you don&apos;t need?</span>
      </h1>

      <p className="relative mt-6 text-lg md:text-xl text-text max-w-lg">
        Ask Hank first.
      </p>

      <p className="relative mt-4 text-sm md:text-base text-text-secondary max-w-md leading-relaxed">
        Hank challenges your reasoning before you spend the money.
        Think of him as the friend who&apos;s better with money than you.
      </p>

      <div className="relative mt-10 flex gap-3">
        <Show when="signed-out">
          <SignUpButton mode="modal" forceRedirectUrl="/conversations">
            <button className="rounded-[10px] bg-accent px-6 py-2.5 text-sm font-medium text-user-text hover:bg-accent-hover transition-colors">
              Try it free
            </button>
          </SignUpButton>
          <SignInButton mode="modal" forceRedirectUrl="/conversations">
            <button className="rounded-[10px] border border-border bg-transparent px-6 py-2.5 text-sm font-medium text-text hover:bg-bg-surface transition-colors">
              Sign in
            </button>
          </SignInButton>
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

      {/* Scroll indicator */}
      <div aria-hidden="true" className="absolute bottom-10 flex flex-col items-center gap-2">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.3em] text-text-secondary">
          Scroll
        </span>
        <ChevronDown className="w-5 h-5 text-accent animate-[scroll-bounce_2s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}

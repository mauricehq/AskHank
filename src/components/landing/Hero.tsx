"use client";

import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <div className="relative flex h-svh flex-col items-center justify-center px-6 text-center">
      {/* Accent glow behind headline */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-accent/6 blur-[100px] rounded-full pointer-events-none" />

      <h1 className="relative text-5xl md:text-7xl font-bold tracking-tight">
        About to buy something{" "}
        <span className="text-accent">you don&apos;t need?</span>
      </h1>

      <p className="relative mt-6 text-base md:text-lg text-text max-w-lg leading-relaxed">
        Tell him what you want to buy. He&apos;ll tell you why you don&apos;t need it.
      </p>

      <p className="relative mt-4 text-sm text-text-secondary max-w-md leading-relaxed">
        You keep the money, or you earn the right to spend it.
      </p>

      <div className="relative mt-10 flex gap-3">
        <Show when="signed-out">
          <SignUpButton mode="modal" forceRedirectUrl="/conversations">
            <button className="rounded-[10px] bg-accent px-6 py-2.5 text-sm font-medium text-user-text hover:bg-accent-hover transition-[colors,transform] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
              Try it free
            </button>
          </SignUpButton>
          <SignInButton mode="modal" forceRedirectUrl="/conversations">
            <button className="rounded-[10px] border border-border bg-transparent px-6 py-2.5 text-sm font-medium text-text hover:bg-bg-surface transition-[colors,transform] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
              Sign in
            </button>
          </SignInButton>
        </Show>
        <Show when="signed-in">
          <Link
            href="/conversations"
            className="rounded-[10px] bg-accent px-6 py-2.5 text-sm font-medium text-user-text hover:bg-accent-hover transition-[colors,transform] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
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

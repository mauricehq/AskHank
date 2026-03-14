"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { ChevronDown } from "lucide-react";

export function Hero() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
        Ask <span className="text-accent">Hank</span>
      </h1>

      <p className="mt-6 text-lg md:text-xl text-text max-w-lg">
        Tell him what you want to buy. He pushes back.
      </p>

      <p className="mt-4 text-sm md:text-base text-text-secondary max-w-md leading-relaxed">
        A spending guardrail disguised as an argument with a friend
        who&apos;s better with money than you are.
      </p>

      <div className="mt-10 flex gap-3">
        <SignUpButton mode="modal">
          <button className="rounded-[10px] bg-accent px-6 py-2.5 text-sm font-medium text-user-text hover:bg-accent-hover transition-colors">
            Try it free
          </button>
        </SignUpButton>
        <SignInButton mode="modal">
          <button className="rounded-[10px] border border-border bg-transparent px-6 py-2.5 text-sm font-medium text-text hover:bg-bg-surface transition-colors">
            Sign in
          </button>
        </SignInButton>
      </div>

      <div aria-hidden="true" className="mt-16 animate-[scroll-bounce_2s_ease-in-out_infinite] text-text-secondary">
        <ChevronDown className="w-5 h-5" />
      </div>
    </div>
  );
}

"use client";

import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { AppShell } from "@/components/AppShell";

export default function Home() {
  return (
    <>
      <Show when="signed-out">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight">
              Ask <span className="text-accent">Hank</span>
            </h1>
            <div className="mt-8 flex justify-center gap-3">
              <SignInButton mode="modal">
                <button className="rounded-[10px] bg-accent px-6 py-2.5 text-sm font-medium text-user-text hover:bg-accent-hover">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="rounded-[10px] border border-border bg-bg-card px-6 py-2.5 text-sm font-medium text-text hover:bg-bg-surface">
                  Sign up
                </button>
              </SignUpButton>
            </div>
          </div>
        </div>
      </Show>
      <Show when="signed-in">
        <AppShell />
      </Show>
    </>
  );
}

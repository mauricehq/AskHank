"use client";

import { ReactNode } from "react";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { useStoreUserEffect } from "@/hooks/useStoreUserEffect";

function Shell({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Ask <span className="text-accent">Hank</span>
        </h1>
        {children}
      </div>
    </div>
  );
}

function AuthenticatedContent() {
  const isLoading = useStoreUserEffect();

  if (isLoading) return null;

  return (
    <>
      <div className="mt-6 flex justify-center">
        <UserButton />
      </div>
      <p className="mt-2 text-text-secondary">
        Tell him what you want to buy. He says no.
      </p>
      <p className="mt-4 text-sm text-text-secondary">
        Chat UI coming in Phase 2.
      </p>
    </>
  );
}

export default function Home() {
  return (
    <Shell>
      <Show when="signed-out">
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
      </Show>
      <Show when="signed-in">
        <AuthenticatedContent />
      </Show>
    </Shell>
  );
}

"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function OnboardingPrompt() {
  const [name, setName] = useState("");
  const setDisplayName = useMutation(api.users.setDisplayName);

  const trimmed = name.trim();
  const canSubmit = trimmed.length >= 1 && trimmed.length <= 30;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setDisplayName({ displayName: trimmed });
  };

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-[400px] rounded-2xl border border-border bg-bg-card p-8 shadow-lg md:p-10">
        <h2 className="mb-6 text-2xl font-bold text-text">
          Ask <span className="text-accent">Hank</span>
        </h2>
        <p className="mb-6 text-base text-text">
          Before we start — what should Hank call you.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            autoFocus
            className="mb-4 w-full rounded-[10px] border-[1.5px] border-border bg-input-bg px-4 py-3 text-[0.9rem] text-text outline-none placeholder:text-text-secondary focus:border-accent"
          />
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-[10px] bg-accent py-2.5 text-sm font-semibold text-user-text hover:bg-accent-hover active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
          >
            Continue
          </button>
        </form>
        <p className="mt-3 text-[0.8rem] text-text-secondary">
          You can change this later in settings.
        </p>
      </div>
    </div>
  );
}

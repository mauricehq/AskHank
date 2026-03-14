"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function OnboardingPrompt() {
  const [name, setName] = useState("");
  const [incomeType, setIncomeType] = useState<"annual" | "hourly">("annual");
  const [incomeInput, setIncomeInput] = useState("");
  const setDisplayName = useMutation(api.users.setDisplayName);
  const setIncome = useMutation(api.users.setIncome);

  const trimmed = name.trim();
  const canSubmit = trimmed.length >= 1 && trimmed.length <= 30;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await setDisplayName({ displayName: trimmed });

    const parsed = parseFloat(incomeInput.replace(/,/g, ""));
    if (incomeInput && parsed > 0) {
      await setIncome({ incomeAmount: parsed, incomeType });
    }
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

          {/* Income (optional) */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1.5">
              <label className="text-sm font-medium text-text">Income</label>
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary bg-bg-surface px-1.5 py-0.5 rounded">
                Optional
              </span>
            </div>
            <p className="text-xs text-text-secondary mb-3">
              Helps Hank reframe prices as hours of your life.
            </p>

            {/* Segmented toggle */}
            <div className="flex mb-2 rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setIncomeType("annual")}
                className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
                  incomeType === "annual"
                    ? "bg-accent text-user-text"
                    : "bg-bg-surface text-text-secondary hover:text-text"
                }`}
              >
                Annual Salary
              </button>
              <button
                type="button"
                onClick={() => setIncomeType("hourly")}
                className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
                  incomeType === "hourly"
                    ? "bg-accent text-user-text"
                    : "bg-bg-surface text-text-secondary hover:text-text"
                }`}
              >
                Hourly Rate
              </button>
            </div>

            {/* Dollar input */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">
                $
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder={incomeType === "annual" ? "65,000" : "31.25"}
                value={incomeInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.,]/g, "");
                  setIncomeInput(val);
                }}
                className="w-full rounded-[10px] border-[1.5px] border-border bg-input-bg pl-7 pr-4 py-3 text-[0.9rem] text-text outline-none placeholder:text-text-secondary focus:border-accent"
              />
            </div>
          </div>

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

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { HANK_MODELS, type ModelConfig } from "@/lib/models";
import type { AppSettingKey } from "../../../convex/appSettings";

const SETTINGS_KEYS: AppSettingKey[] = [
  "hank_model",
  "hank_fallback_model",
  "hank_killswitch",
];

function formatCost(per1K: number): string {
  if (per1K === 0) return "Free";
  return `$${per1K.toFixed(4)}/1K`;
}

// --- ModelSelector (extracted to eliminate duplication) ---

interface ModelSelectorProps {
  label: string;
  name: string;
  value: string;
  onSelect: (modelId: string) => void;
  error: string | null;
}

function ModelSelector({ label, name, value, onSelect, error }: ModelSelectorProps) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
        {label}
      </h2>
      {error && (
        <div className="mb-2 rounded-lg bg-denied/10 px-3 py-2 text-xs text-denied">
          {error}
        </div>
      )}
      <div className="space-y-1">
        {HANK_MODELS.map((model) => (
          <ModelOption
            key={model.id}
            model={model}
            name={name}
            selected={value === model.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

interface ModelOptionProps {
  model: ModelConfig;
  name: string;
  selected: boolean;
  onSelect: (modelId: string) => void;
}

function ModelOption({ model, name, selected, onSelect }: ModelOptionProps) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-[10px] border px-4 py-3 transition-colors ${
        selected
          ? "border-accent bg-accent-soft"
          : "border-border bg-bg-card hover:border-accent"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={model.id}
        checked={selected}
        onChange={() => onSelect(model.id)}
        className="sr-only"
      />
      <div
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? "border-accent" : "border-border"
        }`}
      >
        {selected && <div className="h-2 w-2 rounded-full bg-accent" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-text">
          {model.displayName}
        </div>
        <div className="text-xs text-text-secondary">{model.provider}</div>
      </div>
      <div className="shrink-0 text-right text-xs text-text-secondary">
        <div>In: {formatCost(model.inputPer1K)}</div>
        <div>Out: {formatCost(model.outputPer1K)}</div>
      </div>
    </label>
  );
}

// --- Main component ---

export function HankSettings() {
  const settings = useQuery(api.appSettings.getAll, { keys: SETTINGS_KEYS });
  const setSetting = useMutation(api.appSettings.set);
  const [error, setError] = useState<string | null>(null);

  if (settings === undefined) {
    return (
      <div className="text-sm text-text-secondary">Loading settings...</div>
    );
  }

  const currentModel = (settings.hank_model as string) ?? "openai/gpt-4o-mini";
  const currentFallback =
    (settings.hank_fallback_model as string) ??
    "meta-llama/llama-3.3-70b-instruct:free";
  const killswitch = (settings.hank_killswitch as {
    enabled: boolean;
    reason: string | null;
  }) ?? { enabled: false, reason: null };

  const handleSet = async (key: AppSettingKey, value: unknown) => {
    setError(null);
    try {
      await setSetting({ key, value });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save setting.");
    }
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg bg-denied/10 px-3 py-2 text-xs text-denied">
          {error}
        </div>
      )}

      <ModelSelector
        label="Primary Model"
        name="primary-model"
        value={currentModel}
        onSelect={(id) => handleSet("hank_model", id)}
        error={null}
      />

      <ModelSelector
        label="Fallback Model"
        name="fallback-model"
        value={currentFallback}
        onSelect={(id) => handleSet("hank_fallback_model", id)}
        error={null}
      />

      <KillswitchSection
        killswitch={killswitch}
        onToggle={() =>
          handleSet("hank_killswitch", {
            ...killswitch,
            enabled: !killswitch.enabled,
          })
        }
        onReasonSave={(reason) =>
          handleSet("hank_killswitch", { ...killswitch, reason })
        }
      />
    </div>
  );
}

// --- Killswitch (extracted with debounced reason input) ---

interface KillswitchSectionProps {
  killswitch: { enabled: boolean; reason: string | null };
  onToggle: () => void;
  onReasonSave: (reason: string | null) => void;
}

function KillswitchSection({
  killswitch,
  onToggle,
  onReasonSave,
}: KillswitchSectionProps) {
  const [localReason, setLocalReason] = useState(killswitch.reason ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from server when killswitch changes externally
  useEffect(() => {
    setLocalReason(killswitch.reason ?? "");
  }, [killswitch.reason]);

  const debouncedSave = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onReasonSave(value || null);
      }, 500);
    },
    [onReasonSave]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
        Killswitch
      </h2>
      <div className="rounded-[10px] border border-border bg-bg-card px-4 py-4 space-y-3">
        <div className="flex items-center gap-3">
          <button
            role="switch"
            aria-checked={killswitch.enabled}
            onClick={onToggle}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              killswitch.enabled ? "bg-denied" : "bg-border"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                killswitch.enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-sm font-medium text-text">
            {killswitch.enabled ? "Hank is disabled" : "Hank is active"}
          </span>
        </div>

        {killswitch.enabled && (
          <div>
            <label className="block text-xs text-text-secondary mb-1">
              Reason shown to users
            </label>
            <input
              type="text"
              value={localReason}
              onChange={(e) => {
                setLocalReason(e.target.value);
                debouncedSave(e.target.value);
              }}
              onBlur={() => {
                // Flush immediately on blur
                if (debounceRef.current) clearTimeout(debounceRef.current);
                onReasonSave(localReason || null);
              }}
              placeholder="Maintenance, back soon."
              className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text placeholder:text-text-secondary outline-none focus:border-accent"
            />
          </div>
        )}
      </div>
    </section>
  );
}

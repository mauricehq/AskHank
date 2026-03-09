"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import {
  ArrowLeft,
  Pencil,
  X,
  Check,
  User,
  Mail,
  Palette,
  Sun,
  Moon,
  Shield,
  LogOut,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { useTheme } from "next-themes";
import { api } from "../../convex/_generated/api";

/* ── Local layout primitives ── */

function SettingSection({
  icon: Icon,
  title,
  delay = 0,
  children,
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border border-border bg-bg-card overflow-hidden"
      style={{
        animation: "settings-section-in 0.4s ease-out both",
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="px-5 py-4 border-b border-border bg-bg-surface/50 flex items-center gap-3 text-text-secondary">
        <Icon size={14} />
        <span className="font-bold uppercase tracking-[0.2em] text-[10px]">
          {title}
        </span>
      </div>
      <div className="divide-y divide-border px-5">{children}</div>
    </section>
  );
}

function SettingRow({
  icon: Icon,
  label,
  description,
  children,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-5 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="p-2.5 rounded-xl bg-bg-surface text-text-secondary border border-border hidden sm:flex items-center justify-center shrink-0">
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-text text-sm sm:text-base tracking-tight">
            {label}
          </div>
          <div className="text-xs text-text-secondary mt-0.5">
            {description}
          </div>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* ── Button classes ── */

const btnStandardClass =
  "rounded-xl text-[10px] font-bold uppercase tracking-widest border border-border bg-bg-card text-text-secondary hover:border-accent/50 hover:text-text hover:bg-bg-surface px-4 py-2.5 active:scale-[0.97] transition-colors";

const btnDangerClass =
  "rounded-xl text-[10px] font-bold uppercase tracking-widest border border-red-500/30 bg-red-500/5 text-red-500 hover:bg-red-500/10 hover:border-red-500/50 px-4 py-2.5 active:scale-[0.97] transition-colors";

/* ── Main component ── */

interface SettingsPanelProps {
  onBack: () => void;
}

export function SettingsPanel({ onBack }: SettingsPanelProps) {
  const user = useQuery(api.users.currentUser);
  const setDisplayName = useMutation(api.users.setDisplayName);
  const deleteAccountMutation = useMutation(api.users.deleteAccount);
  const { signOut } = useClerk();
  const { resolvedTheme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => setMounted(true), []);

  const displayName = user?.displayName ?? "";
  const email = user?.email ?? "";
  const isDark = resolvedTheme === "dark";

  const closeDeleteModal = useCallback(() => {
    setDeleteStep(0);
    setDeleteInput("");
  }, []);

  // Escape key closes delete modal; body scroll lock while open
  useEffect(() => {
    if (deleteStep === 0) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDeleteModal();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [deleteStep, closeDeleteModal]);

  const startEditing = () => {
    setNameInput(displayName);
    setIsEditingName(true);
  };

  const saveName = async () => {
    const trimmed = nameInput.trim();
    if (trimmed.length >= 1 && trimmed.length <= 30) {
      await setDisplayName({ displayName: trimmed });
      setIsEditingName(false);
    }
  };

  const cancelEditing = () => {
    setIsEditingName(false);
    setNameInput("");
  };

  const handleDelete = async () => {
    if (deleteInput !== "DELETE") return;
    setIsDeleting(true);
    try {
      await deleteAccountMutation();
      await signOut();
    } catch {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-4 py-3 md:px-6">
        <div className="mx-auto max-w-[720px]">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-surface hover:text-text"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-lg font-bold tracking-tight text-text">
              Settings
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] px-4 py-4 md:px-6 md:py-6 space-y-5">
          {/* ── Profile ── */}
          <SettingSection icon={User} title="Profile" delay={0}>
            <SettingRow
              icon={User}
              label="Display Name"
              description="What Hank calls you"
            >
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    maxLength={30}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveName();
                      if (e.key === "Escape") cancelEditing();
                    }}
                    className="w-full max-w-[200px] rounded-lg border-[1.5px] border-border bg-input-bg px-2.5 py-1 text-sm text-text outline-none focus:border-accent"
                  />
                  <button
                    onClick={saveName}
                    disabled={nameInput.trim().length < 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-accent hover:bg-bg-surface disabled:opacity-50"
                    aria-label="Save"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-surface"
                    aria-label="Cancel"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-secondary">
                    {displayName}
                  </span>
                  <button
                    onClick={startEditing}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-surface hover:text-text"
                    aria-label="Edit display name"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              )}
            </SettingRow>
            <SettingRow
              icon={Mail}
              label="Email"
              description="Account email"
            >
              <span className="text-sm text-text-secondary">{email}</span>
            </SettingRow>
          </SettingSection>

          {/* ── Appearance ── */}
          <SettingSection icon={Palette} title="Appearance" delay={80}>
            <SettingRow
              icon={isDark ? Moon : Sun}
              label="Theme"
              description="Switch between light and dark"
            >
              {mounted ? (
                <button
                  role="switch"
                  aria-checked={isDark}
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 ${
                    isDark ? "bg-accent" : "bg-border"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${
                      isDark ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              ) : (
                <div className="h-7 w-12 rounded-full bg-border" />
              )}
            </SettingRow>
          </SettingSection>

          {/* ── Account ── */}
          <SettingSection icon={Shield} title="Account" delay={160}>
            <SettingRow
              icon={LogOut}
              label="Sign Out"
              description="Sign out of your account"
            >
              <button onClick={() => signOut()} className={btnStandardClass}>
                Sign Out
              </button>
            </SettingRow>
            <SettingRow
              icon={Trash2}
              label="Delete Account"
              description="Permanently delete your account"
            >
              <button
                onClick={() => setDeleteStep(1)}
                className={btnDangerClass}
              >
                Delete
              </button>
            </SettingRow>
          </SettingSection>
        </div>
      </div>

      {/* ── Delete Account Modal ── */}
      {deleteStep > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={closeDeleteModal}
        >
          <div
            className="w-full max-w-[420px] rounded-3xl border border-border bg-bg-card shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {deleteStep === 1 ? (
              <div className="p-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
                  <AlertTriangle size={24} className="text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-text mb-2">
                  Delete account?
                </h3>
                <p className="text-sm text-text-secondary mb-5">
                  This action is permanent and cannot be undone.
                </p>
                <ul className="text-sm text-text-secondary text-left mb-6 space-y-1.5 pl-1">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    All conversation history
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    Your profile and settings
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    Any remaining credits
                  </li>
                </ul>
                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={() => setDeleteStep(2)}
                    className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 active:scale-[0.98] transition-colors"
                  >
                    Continue
                  </button>
                  <button
                    onClick={closeDeleteModal}
                    className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text hover:bg-bg-surface transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center">
                <h3 className="text-lg font-bold text-text mb-2">
                  Confirm deletion
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  Type{" "}
                  <span className="font-mono font-semibold text-text">
                    DELETE
                  </span>{" "}
                  to confirm.
                </p>
                <input
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  autoFocus
                  placeholder="DELETE"
                  className="mb-5 w-full rounded-xl border-[1.5px] border-border bg-input-bg px-4 py-2.5 text-sm text-text font-mono tracking-widest text-center outline-none placeholder:text-text-secondary focus:border-red-500"
                />
                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={handleDelete}
                    disabled={deleteInput !== "DELETE" || isDeleting}
                    className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 active:scale-[0.98] transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isDeleting ? "Deleting..." : "Delete my account"}
                  </button>
                  <button
                    onClick={closeDeleteModal}
                    className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text hover:bg-bg-surface transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {/* Accent bottom bar */}
            <div className="h-1 w-full bg-gradient-to-r from-red-500 via-denied to-red-500" />
          </div>
        </div>
      )}
    </div>
  );
}

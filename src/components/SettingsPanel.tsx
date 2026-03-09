"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Pencil, X, Check } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ThemeToggle } from "./ThemeToggle";

interface SettingsPanelProps {
  onBack: () => void;
}

export function SettingsPanel({ onBack }: SettingsPanelProps) {
  const user = useQuery(api.users.currentUser);
  const setDisplayName = useMutation(api.users.setDisplayName);
  const deleteAccountMutation = useMutation(api.users.deleteAccount);
  const { signOut } = useClerk();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const displayName = user?.displayName ?? "";
  const email = user?.email ?? "";

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
        <div className="mx-auto max-w-[720px] px-4 py-4 md:px-6 md:py-6 space-y-6">
          {/* Profile Section */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-3">
              Profile
            </h2>
            <div className="rounded-xl border border-border bg-bg-card divide-y divide-border">
              {/* Display Name */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-text-secondary mb-0.5">Display name</div>
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
                    <div className="text-sm text-text">{displayName}</div>
                  )}
                </div>
                {!isEditingName && (
                  <button
                    onClick={startEditing}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-surface hover:text-text"
                    aria-label="Edit display name"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
              {/* Email */}
              <div className="px-4 py-3">
                <div className="text-xs text-text-secondary mb-0.5">Email</div>
                <div className="text-sm text-text">{email}</div>
              </div>
            </div>
          </section>

          {/* Appearance Section */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-3">
              Appearance
            </h2>
            <div className="rounded-xl border border-border bg-bg-card">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="text-sm text-text">Theme</div>
                <ThemeToggle />
              </div>
            </div>
          </section>

          {/* Account Section */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-3">
              Account
            </h2>
            <div className="rounded-xl border border-border bg-bg-card divide-y divide-border">
              <div className="px-4 py-3">
                <button
                  onClick={() => signOut()}
                  className="rounded-[10px] border border-border px-4 py-2 text-sm font-medium text-text hover:bg-bg-surface active:scale-[0.97]"
                >
                  Sign out
                </button>
              </div>
              <div className="px-4 py-3">
                <button
                  onClick={() => setDeleteStep(1)}
                  className="rounded-[10px] px-4 py-2 text-sm font-medium text-red-500 border border-red-500/30 hover:bg-red-500/10 active:scale-[0.97]"
                >
                  Delete account
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Delete Account Modal */}
      {deleteStep > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeDeleteModal}
        >
          <div
            className="w-full max-w-[420px] rounded-2xl border border-border bg-bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {deleteStep === 1 ? (
              <>
                <h3 className="text-lg font-bold text-text mb-2">Delete account?</h3>
                <p className="text-sm text-text-secondary mb-6">
                  This will permanently delete your account and all conversation
                  history. This cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={closeDeleteModal}
                    className="rounded-[10px] border border-border px-4 py-2 text-sm font-medium text-text hover:bg-bg-surface"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setDeleteStep(2)}
                    className="rounded-[10px] px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 active:scale-[0.97]"
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-text mb-2">Confirm deletion</h3>
                <p className="text-sm text-text-secondary mb-4">
                  Type <span className="font-mono font-semibold text-text">DELETE</span> to confirm.
                </p>
                <input
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  autoFocus
                  placeholder="DELETE"
                  className="mb-4 w-full rounded-[10px] border-[1.5px] border-border bg-input-bg px-4 py-2.5 text-sm text-text outline-none placeholder:text-text-secondary focus:border-red-500"
                />
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={closeDeleteModal}
                    className="rounded-[10px] border border-border px-4 py-2 text-sm font-medium text-text hover:bg-bg-surface"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteInput !== "DELETE" || isDeleting}
                    className="rounded-[10px] px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isDeleting ? "Deleting..." : "Delete my account"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

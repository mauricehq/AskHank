"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export function ContentManager() {
  const cuts = useQuery(api.replayCuts.list);
  const updateMessages = useMutation(api.replayCuts.updateMessages);
  const deleteCutMutation = useMutation(api.replayCuts.deleteCut);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingMsg, setEditingMsg] = useState<{
    cutId: string;
    index: number;
  } | null>(null);
  const [editText, setEditText] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  if (cuts === undefined) {
    return (
      <div className="text-sm text-text-secondary">Loading content...</div>
    );
  }

  const handleCopyUrl = async (token: string) => {
    const url = `${window.location.origin}/replay/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Failed to copy URL");
    }
  };

  const handleDelete = async (cutId: Id<"replayCuts">) => {
    setError(null);
    setPendingDeleteId(null);
    try {
      await deleteCutMutation({ cutId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete cut.");
    }
  };

  const handleStartEdit = (
    cutId: string,
    index: number,
    content: string
  ) => {
    setEditingMsg({ cutId, index });
    setEditText(content);
  };

  const handleSaveEdit = async (cut: {
    _id: Id<"replayCuts">;
    messages: { role: "user" | "hank"; content: string }[];
  }) => {
    if (!editingMsg) return;
    setError(null);
    try {
      const updated = cut.messages.map((msg, i) =>
        i === editingMsg.index ? { ...msg, content: editText } : msg
      );
      await updateMessages({ cutId: cut._id, messages: updated });
      setEditingMsg(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update message.");
    }
  };

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-lg bg-denied/10 px-3 py-2 text-xs text-denied">
          {error}
        </div>
      )}
      <div className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
        {cuts.length} cut{cuts.length !== 1 ? "s" : ""}
      </div>

      {cuts.length === 0 && (
        <div className="rounded-[10px] border border-border bg-bg-card px-4 py-6 text-center text-sm text-text-secondary">
          No cuts yet. Use{" "}
          <code className="rounded bg-bg-surface px-1.5 py-0.5 font-mono text-xs text-text">
            /tiktok-cut
          </code>{" "}
          to create one from a conversation.
        </div>
      )}

      <div className="space-y-1">
        {cuts.map((cut) => {
          const isExpanded = expandedId === cut._id;
          const isDenied = cut.verdict === "denied";
          return (
            <div
              key={cut._id}
              className="rounded-[10px] border border-border bg-bg-card"
            >
              {/* Row header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : cut._id)
                  }
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="capitalize truncate text-sm font-medium text-text">
                        {cut.item}
                      </span>
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[0.65rem] font-bold uppercase ${
                          isDenied
                            ? "bg-denied/15 text-denied"
                            : "bg-approved/15 text-approved"
                        }`}
                      >
                        {cut.verdict}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-text-secondary">
                      {cut.messages[0]?.content}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-text-secondary">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </button>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => handleCopyUrl(cut.token)}
                    className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-accent hover:text-accent transition-colors"
                  >
                    {copied === cut.token ? "Copied!" : "Copy URL"}
                  </button>
                  {pendingDeleteId === cut._id ? (
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className="text-text-secondary">Sure?</span>
                      <button
                        onClick={() => handleDelete(cut._id)}
                        className="rounded-lg border border-denied px-2 py-1 font-medium text-denied hover:bg-denied/10 transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setPendingDeleteId(null)}
                        className="rounded-lg border border-border px-2 py-1 font-medium text-text-secondary hover:text-text transition-colors"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setPendingDeleteId(cut._id)}
                      className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text-secondary hover:border-denied hover:text-denied transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded messages */}
              {isExpanded && (
                <div className="border-t border-border px-4 py-3 space-y-3">
                  {cut.messages.map((msg, i) => {
                    const isEditing =
                      editingMsg?.cutId === cut._id &&
                      editingMsg.index === i;
                    const isHank = msg.role === "hank";
                    return (
                      <div key={i} className="space-y-1">
                        <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-text-secondary">
                          {isHank ? "Hank" : "User"}
                        </div>
                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full rounded-lg border border-accent bg-bg-surface px-3 py-2 text-sm text-text outline-none resize-none"
                              rows={3}
                              autoFocus
                            />
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleSaveEdit(cut)}
                                className="rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-user-text hover:bg-accent/90 transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingMsg(null)}
                                className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              handleStartEdit(cut._id, i, msg.content)
                            }
                            className="w-full text-left rounded-lg px-3 py-2 text-sm text-text hover:bg-bg-surface transition-colors"
                          >
                            {msg.content}
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {cut.verdictSummary && (
                    <div className="pt-1 text-xs italic text-text-secondary">
                      {cut.verdictSummary}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

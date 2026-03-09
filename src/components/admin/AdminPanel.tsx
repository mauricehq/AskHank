"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { UserManagement } from "./UserManagement";
import { HankSettings } from "./HankSettings";
import { TraceInspector } from "./TraceInspector";

const TABS = ["Users", "Hank Settings", "Traces"] as const;
type Tab = (typeof TABS)[number];

interface AdminPanelProps {
  onBack: () => void;
}

export function AdminPanel({ onBack }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Users");

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-4 py-3 md:px-6">
        <div className="mx-auto max-w-[720px]">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={onBack}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-surface hover:text-text"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-lg font-bold tracking-tight text-text">
              Admin
            </h1>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-accent text-user-text"
                    : "text-text-secondary hover:bg-bg-surface hover:text-text"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] px-4 py-4 md:px-6 md:py-6">
          {activeTab === "Users" && <UserManagement />}
          {activeTab === "Hank Settings" && <HankSettings />}
          {activeTab === "Traces" && <TraceInspector />}
        </div>
      </div>
    </div>
  );
}

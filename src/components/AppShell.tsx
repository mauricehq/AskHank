"use client";

import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useStoreUserEffect } from "@/hooks/useStoreUserEffect";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { SessionErrorBanner } from "./SessionErrorBanner";
import { Sidebar } from "./Sidebar";
import { MobileTopBar } from "./MobileTopBar";
import { EmptyState } from "./EmptyState";
import { ChatScreen } from "./ChatScreen";
import { OnboardingPrompt } from "./OnboardingPrompt";
import { AdminPanel } from "./admin/AdminPanel";
import { SettingsPanel } from "./SettingsPanel";
import { CreditsModal } from "./CreditsModal";
import { useUserAccess } from "@/hooks/useUserAccess";

export function AppShell() {
  const { isLoading, sessionError, clearSessionError } = useStoreUserEffect();
  const user = useQuery(api.users.currentUser);
  const { canAccessAdminPanel } = useUserAccess();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [sidebarOpen, setSidebarOpen] = useLocalStorage("hank-sidebar-open", true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<"empty" | "chat" | "admin" | "settings">("empty");
  const [activeConversationId, setActiveConversationId] = useState<Id<"conversations"> | null>(null);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);

  // Handle Stripe return URL
  const [creditToast, setCreditToast] = useState<"success" | "cancelled" | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const creditsParam = params.get("credits");
    if (creditsParam === "success" || creditsParam === "cancelled") {
      setCreditToast(creditsParam);
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete("credits");
      window.history.replaceState({}, "", url.pathname + url.search);
      // Auto-dismiss toast
      setTimeout(() => setCreditToast(null), 4000);
    }
  }, []);

  if (isLoading || user === undefined) return null;

  const needsOnboarding = user !== null && user.displayName == null;

  const sidebarIsOpen = isDesktop ? sidebarOpen : mobileSidebarOpen;

  return (
    <div className="flex h-dvh flex-col bg-bg md:flex-row">
      {/* Mobile top bar */}
      <MobileTopBar onMenuClick={() => setMobileSidebarOpen(true)} />

      {/* Single Sidebar instance — renders desktop panel or mobile overlay based on isDesktop */}
      <Sidebar
        isOpen={sidebarIsOpen}
        isDesktop={isDesktop}
        onClose={() => isDesktop ? setSidebarOpen(false) : setMobileSidebarOpen(false)}
        onToggle={() => isDesktop ? setSidebarOpen((prev) => !prev) : setMobileSidebarOpen((prev) => !prev)}
        onNewConversation={() => { setActiveConversationId(null); setCurrentView("empty"); }}
        onSelectConversation={(id) => { setActiveConversationId(id); setCurrentView("chat"); }}
        activeConversationId={activeConversationId}
        onOpenAdmin={() => setCurrentView("admin")}
        onOpenSettings={() => setCurrentView("settings")}
        onDeleteConversation={(id) => {
          if (id === activeConversationId) {
            setActiveConversationId(null);
            setCurrentView("empty");
          }
        }}
        onOpenCredits={() => setCreditsModalOpen(true)}
      />

      {/* Main content */}
      <main className="relative flex min-w-0 flex-1 flex-col">
        {/* Session error banner */}
        {sessionError && (
          <div className="shrink-0 px-4 pt-2">
            <SessionErrorBanner sessionError={sessionError} clearSessionError={clearSessionError} />
          </div>
        )}

        {/* Desktop expand button (visible when sidebar collapsed) */}
        {isDesktop && !sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-[10px] text-text hover:bg-bg-surface"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
        )}

        {needsOnboarding ? (
          <OnboardingPrompt />
        ) : currentView === "settings" ? (
          <SettingsPanel onBack={() => setCurrentView("empty")} />
        ) : currentView === "admin" && canAccessAdminPanel ? (
          <AdminPanel onBack={() => setCurrentView("empty")} />
        ) : currentView === "chat" ? (
          <ChatScreen conversationId={activeConversationId} onConversationCreated={setActiveConversationId} onNewConversation={() => { setActiveConversationId(null); setCurrentView("empty"); }} onOpenCredits={() => setCreditsModalOpen(true)} />
        ) : (
          <EmptyState onStartChat={() => setCurrentView("chat")} />
        )}
      </main>

      {/* Credits modal */}
      <CreditsModal open={creditsModalOpen} onClose={() => setCreditsModalOpen(false)} />

      {/* Credit purchase toast */}
      {creditToast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className={`rounded-xl px-5 py-3 text-sm font-medium shadow-lg ${
            creditToast === "success"
              ? "bg-green-600 text-white"
              : "bg-bg-card border border-border text-text"
          }`}>
            {creditToast === "success"
              ? "Credits added!"
              : "Purchase cancelled"}
          </div>
        </div>
      )}
    </div>
  );
}

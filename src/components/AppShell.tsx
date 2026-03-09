"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
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
import { useUserAccess } from "@/hooks/useUserAccess";

export function AppShell() {
  const { isLoading, sessionError, clearSessionError } = useStoreUserEffect();
  const user = useQuery(api.users.currentUser);
  const { canAccessAdminPanel } = useUserAccess();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [sidebarOpen, setSidebarOpen] = useLocalStorage("hank-sidebar-open", true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<"empty" | "chat" | "admin">("empty");

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
        onNewConversation={() => setCurrentView("empty")}
        onOpenAdmin={() => setCurrentView("admin")}
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
        ) : currentView === "admin" && canAccessAdminPanel ? (
          <AdminPanel onBack={() => setCurrentView("empty")} />
        ) : currentView === "chat" ? (
          <ChatScreen onNewConversation={() => setCurrentView("empty")} />
        ) : (
          <EmptyState onStartChat={() => setCurrentView("chat")} />
        )}
      </main>
    </div>
  );
}

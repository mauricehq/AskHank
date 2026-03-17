"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../../../convex/_generated/api";
import { useStoreUserEffect } from "@/hooks/useStoreUserEffect";
import { SessionErrorBanner } from "@/components/SessionErrorBanner";
import { Sidebar } from "@/components/Sidebar";
import { MobileTopBar } from "@/components/MobileTopBar";
import { OnboardingPrompt } from "@/components/OnboardingPrompt";
import { CreditsModal } from "@/components/CreditsModal";
import { AppLayoutProvider, useAppLayout } from "@/components/AppLayoutContext";

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { isLoading, sessionError, clearSessionError } = useStoreUserEffect();
  const user = useQuery(api.users.currentUser);
  const {
    sidebarOpen,
    setSidebarOpen,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    isDesktop,
    creditsModalOpen,
    setCreditsModalOpen,
  } = useAppLayout();

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

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarIsOpen}
        isDesktop={isDesktop}
        onClose={() => isDesktop ? setSidebarOpen(false) : setMobileSidebarOpen(false)}
        onToggle={() => isDesktop ? setSidebarOpen((prev: boolean) => !prev) : setMobileSidebarOpen((prev: boolean) => !prev)}
      />

      {/* Main content */}
      <main className="relative flex min-w-0 flex-1 flex-col">
        {/* Session error banner */}
        {sessionError && (
          <div className="shrink-0 px-4 pt-2">
            <SessionErrorBanner sessionError={sessionError} clearSessionError={clearSessionError} />
          </div>
        )}

        {needsOnboarding ? (
          <OnboardingPrompt />
        ) : (
          children
        )}

        {/* Credit purchase toast */}
        <AnimatePresence>
          {creditToast && (
            <div className="pointer-events-none absolute inset-0 z-50 flex items-end justify-center pb-6">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } }}
                exit={{ opacity: 0, y: 8, transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] } }}
                className={`pointer-events-auto rounded-xl px-5 py-3 text-sm font-medium shadow-lg ${
                  creditToast === "success"
                    ? "bg-accent text-user-text"
                    : "bg-bg-card border border-border text-text"
                }`}
              >
                {creditToast === "success"
                  ? "Credits added!"
                  : "Purchase cancelled"}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Credits modal */}
      <CreditsModal open={creditsModalOpen} onClose={() => setCreditsModalOpen(false)} />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayoutProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </AppLayoutProvider>
  );
}

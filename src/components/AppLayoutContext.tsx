"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface AppLayoutContextValue {
  openCreditsModal: () => void;
  creditsModalOpen: boolean;
  setCreditsModalOpen: (open: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isDesktop: boolean;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
}

const AppLayoutContext = createContext<AppLayoutContextValue | null>(null);

export function AppLayoutProvider({ children }: { children: ReactNode }) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [sidebarOpen, setSidebarOpen] = useLocalStorage("hank-sidebar-open", true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  return (
    <AppLayoutContext.Provider
      value={{
        openCreditsModal: () => setCreditsModalOpen(true),
        creditsModalOpen,
        setCreditsModalOpen,
        sidebarOpen,
        setSidebarOpen,
        mobileSidebarOpen,
        setMobileSidebarOpen,
        isDesktop,
        activeConversationId,
        setActiveConversationId,
      }}
    >
      {children}
    </AppLayoutContext.Provider>
  );
}

export function useAppLayout() {
  const ctx = useContext(AppLayoutContext);
  if (!ctx) throw new Error("useAppLayout must be used within AppLayoutProvider");
  return ctx;
}

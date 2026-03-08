"use client";

import { ReactNode } from "react";
import { useConvexAuth } from "convex/react";
import { SignIn, UserButton } from "@clerk/nextjs";
import { useStoreUserEffect } from "@/hooks/useStoreUserEffect";

const clerkAppearance = {
  variables: {
    colorPrimary: "#C65A2E",
    fontFamily: '"DM Sans", sans-serif',
    borderRadius: "10px",
  },
  elements: {
    card: {
      backgroundColor: "#FFFFFF",
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      border: "1px solid #D9D3CC",
    },
    headerTitle: {
      color: "#1F1F1F",
      fontWeight: "700",
    },
    headerSubtitle: {
      color: "#7A7A7A",
    },
    formButtonPrimary: {
      backgroundColor: "#C65A2E",
      "&:hover": {
        backgroundColor: "#B04E26",
      },
    },
    formFieldInput: {
      borderColor: "#D9D3CC",
      backgroundColor: "#FFFFFF",
      "&:focus": {
        borderColor: "#C65A2E",
      },
    },
    dividerLine: {
      backgroundColor: "#D9D3CC",
    },
    dividerText: {
      color: "#7A7A7A",
    },
    footerActionLink: {
      color: "#C65A2E",
      "&:hover": {
        color: "#B04E26",
      },
    },
  },
};

function Shell({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Ask <span className="text-accent">Hank</span>
        </h1>
        {children}
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  const isStoring = useStoreUserEffect();

  if (isStoring) {
    return <Shell />;
  }

  return (
    <Shell>
      <div className="mt-6 flex justify-center">
        <UserButton />
      </div>
      <p className="mt-2 text-text-secondary">
        Tell him what you want to buy. He says no.
      </p>
      <p className="mt-4 text-sm text-text-secondary">
        Chat UI coming in Phase 2.
      </p>
    </Shell>
  );
}

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return <Shell />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-8 text-4xl font-bold tracking-tight">
            Ask <span className="text-accent">Hank</span>
          </h1>
          <SignIn appearance={clerkAppearance} routing="hash" />
        </div>
      </div>
    );
  }

  return <AuthenticatedApp />;
}

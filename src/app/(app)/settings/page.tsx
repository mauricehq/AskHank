"use client";

import { useRouter } from "next/navigation";
import { SettingsPanel } from "@/components/SettingsPanel";
import { useAppLayout } from "@/components/AppLayoutContext";

export default function SettingsPage() {
  const router = useRouter();
  const { openCreditsModal } = useAppLayout();

  return (
    <SettingsPanel
      onBack={() => router.push("/conversations")}
      onOpenCredits={openCreditsModal}
    />
  );
}

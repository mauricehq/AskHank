"use client";

import { useRouter } from "next/navigation";
import { StatsPanel } from "@/components/StatsPanel";

export default function StatsPage() {
  const router = useRouter();

  return (
    <StatsPanel
      onBack={() => router.push("/conversations")}
      onOpenSettings={() => router.push("/settings")}
    />
  );
}

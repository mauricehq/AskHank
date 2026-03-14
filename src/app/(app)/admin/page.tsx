"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { useUserAccess } from "@/hooks/useUserAccess";

export default function AdminPage() {
  const router = useRouter();
  const { canAccessAdminPanel } = useUserAccess();

  useEffect(() => {
    if (!canAccessAdminPanel) {
      router.replace("/conversations");
    }
  }, [canAccessAdminPanel, router]);

  if (!canAccessAdminPanel) return null;

  return <AdminPanel onBack={() => router.push("/conversations")} />;
}

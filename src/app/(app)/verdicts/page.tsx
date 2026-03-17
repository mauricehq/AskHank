"use client";

import { useRouter } from "next/navigation";
import { VerdictHistory } from "@/components/VerdictHistory";

export default function VerdictsPage() {
  const router = useRouter();
  return <VerdictHistory onBack={() => router.push("/conversations")} />;
}

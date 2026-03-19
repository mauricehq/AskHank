"use client";

import { useRouter } from "next/navigation";
import { DecisionHistory } from "@/components/DecisionHistory";

export default function DecisionsPage() {
  const router = useRouter();
  return <DecisionHistory onBack={() => router.push("/conversations")} />;
}

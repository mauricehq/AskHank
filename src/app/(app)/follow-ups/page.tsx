"use client";

import { useRouter } from "next/navigation";
import { FollowUpsPage } from "@/components/FollowUpsPage";

export default function FollowUpsRoute() {
  const router = useRouter();
  return <FollowUpsPage onBack={() => router.push("/conversations")} />;
}

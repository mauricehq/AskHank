"use client";

import { Show } from "@clerk/nextjs";
import { AppShell } from "@/components/AppShell";
import { LandingPage } from "@/components/landing/LandingPage";

export default function Home() {
  return (
    <>
      <Show when="signed-out">
        <LandingPage />
      </Show>
      <Show when="signed-in">
        <AppShell />
      </Show>
    </>
  );
}

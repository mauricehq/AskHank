"use client";

import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { ChatDemo } from "./ChatDemo";
import { HowItWorks } from "./HowItWorks";
import { Scorecard } from "./Scorecard";
import { AiComparison } from "./AiComparison";
import { WhyHankWorks } from "./WhyHankWorks";
import { FreeToTry } from "./FreeToTry";
import { FairWarning } from "./FairWarning";
import { FinalCTA } from "./FinalCTA";
import { FAQ } from "./FAQ";
import { Footer } from "./Footer";

export function LandingPage() {
  return (
    <>
      <Navbar />
      <main className="overflow-x-hidden">
        <Hero />
        <section id="demo">
          <ChatDemo />
        </section>
        <section className="bg-bg-surface">
          <AiComparison />
        </section>
        <section id="how-it-works">
          <HowItWorks />
        </section>
        <section className="bg-bg-surface">
          <WhyHankWorks />
        </section>
        <section>
          <Scorecard />
        </section>
        <section id="pricing" className="bg-bg-surface">
          <FreeToTry />
        </section>
        <FairWarning />
        <FinalCTA />
        <section className="bg-bg-surface">
          <FAQ />
        </section>
      </main>
      <Footer />
    </>
  );
}

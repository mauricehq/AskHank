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
import { AnimateIn } from "./AnimateIn";

export function LandingPage() {
  return (
    <>
      <Navbar />
      <main className="overflow-x-hidden">
        <Hero />
        <section id="demo">
          <ChatDemo />
        </section>
        <AnimateIn as="section" className="bg-bg-surface">
          <AiComparison />
        </AnimateIn>
        <AnimateIn as="section" id="how-it-works">
          <HowItWorks />
        </AnimateIn>
        <AnimateIn as="section" className="bg-bg-surface">
          <WhyHankWorks />
        </AnimateIn>
        <AnimateIn as="section">
          <Scorecard />
        </AnimateIn>
        <AnimateIn as="section" id="pricing" className="bg-bg-surface">
          <FreeToTry />
        </AnimateIn>
        <AnimateIn>
          <FairWarning />
        </AnimateIn>
        <AnimateIn>
          <FinalCTA />
        </AnimateIn>
        <AnimateIn as="section" className="bg-bg-surface">
          <FAQ />
        </AnimateIn>
      </main>
      <Footer />
    </>
  );
}

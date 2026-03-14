"use client";

import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { ChatDemo } from "./ChatDemo";
import { HowItWorks } from "./HowItWorks";
import { Scorecard } from "./Scorecard";
import { WhyHankWorks } from "./WhyHankWorks";
import { FreeToTry } from "./FreeToTry";
import { FairWarning } from "./FairWarning";
import { FinalCTA } from "./FinalCTA";
import { Footer } from "./Footer";

export function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <section id="demo">
          <ChatDemo />
        </section>
        <section id="how-it-works">
          <HowItWorks />
        </section>
        <Scorecard />
        <WhyHankWorks />
        <section id="pricing">
          <FreeToTry />
        </section>
        <FairWarning />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}

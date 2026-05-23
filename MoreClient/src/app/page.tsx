"use client";

import { LandingNav } from "@/components/landing/landing-nav";
import { Hero } from "@/components/landing/hero";
import { LogoCloud } from "@/components/landing/logo-cloud";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050508]">
      <LandingNav />
      <main>
        <Hero />
        <LogoCloud />
        <FeatureGrid />
        <HowItWorks />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}

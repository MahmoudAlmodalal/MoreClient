"use client";

import { LandingNav } from "@/components/landing/landing-nav";
import { Hero } from "@/components/landing/hero";
import { AboutUs } from "@/components/landing/about-us";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { Showcase } from "@/components/landing/showcase";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#101020] text-white">
      <LandingNav />
      <main>
        <Hero />
        <AboutUs />
        <FeatureGrid />
        <Showcase />
        <Pricing />
        <Faq />
      </main>
      <LandingFooter />
    </div>
  );
}

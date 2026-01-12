'use client';

import React, { useState } from 'react';
import { Hero } from '@/components/features/Hero';
import { Pricing } from '@/components/features/Pricing';
import {
  TrustedBy,
  FeatureSteps,
  FeatureShowcase,
  StatsBanner,
  AppBenefits,
  FAQ,
  Testimonials,
  Newsletter,
  Footer
} from '@/components/features/LandingContent';
import { Navbar } from '@/components/layout/Navbar';
import LandingChatWidget from '@/components/LandingChatWidget';

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-white">
      {/* Ambient Background - World Class Visuals */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-blue-500/10 rounded-full blur-[120px] opacity-60 animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-violet-500/10 rounded-full blur-[120px] opacity-60 animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <Navbar />

      <Hero />
      <TrustedBy />
      <FeatureSteps />
      <FeatureShowcase />
      <StatsBanner />
      <AppBenefits />
      <FAQ />
      <Testimonials />
      <Pricing />
      <Newsletter />
      <Footer />
      <LandingChatWidget />
    </main>
  );
}

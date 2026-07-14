"use client";

import type { CSSProperties } from "react";

import { ShaderBackground } from "@/components/landing/shader-background";
import {
  StitchFinalCta,
  StitchFooter,
  StitchHero,
  StitchIdentity,
  StitchIntelligence,
  StitchNav,
  StitchSiteSection,
} from "@/components/landing/stitch-sections";

type Props = {
  className?: string;
};

const themeVars = {
  "--ln-bg": "#0f1419",
  "--ln-on": "#e2eaf4",
  "--ln-muted": "#a8b6c9",
  "--ln-primary": "#8eb6ff",
  "--ln-primary-container": "#3b82f6",
  "--ln-on-primary": "#001a4d",
  "--ln-surface-high": "#1e2733",
  "--ln-surface-lowest": "#0a0e13",
  "--ln-outline": "#7a889c",
} as CSSProperties;

/**
 * Landing Barbernegon — design Stitch (Dark Cinematic Minimalism),
 * paleta Electric Blue no lugar do violeta original.
 */
export function BarbernegonLanding({ className = "" }: Props) {
  return (
    <div
      className={`${className} relative min-h-svh overflow-x-clip bg-[var(--ln-bg)] font-[family-name:var(--font-ln-body)] text-[var(--ln-on)] antialiased selection:bg-[var(--ln-primary-container)] selection:text-white`}
      style={themeVars}
    >
      <ShaderBackground />
      <StitchNav />
      <main className="relative z-10 pt-0">
        <StitchHero />
        <StitchIdentity />
        <StitchSiteSection />
        <StitchIntelligence />
        <StitchFinalCta />
      </main>
      <StitchFooter />
    </div>
  );
}

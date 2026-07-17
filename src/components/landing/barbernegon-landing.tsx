"use client";

import type { CSSProperties } from "react";

import {
  StitchFinalCta,
  StitchHero,
  StitchIdentity,
  StitchIntelligence,
  StitchSiteSection,
} from "@/components/landing/stitch-sections";

type Props = {
  className?: string;
};

const themeVars = {
  "--ln-bg": "#10131a",
  "--ln-on": "#e1e2ec",
  "--ln-on-variant": "#c2c6d6",
  "--ln-muted": "#9CA3AF",
  "--ln-primary": "#adc6ff",
  "--ln-primary-container": "#3B82F6",
  "--ln-surface-low": "#191b23",
  "--ln-surface-elevated": "#25282B",
  "--ln-surface-container": "#1d2027",
  "--ln-surface-lowest": "#0b0e15",
  "--ln-border": "#2F3336",
  "--ln-outline": "#8c909f",
  "--ln-accent-gold": "#C5A059",
  "--ln-error": "#ffb4ab",
} as CSSProperties;

/**
 * Landing Barbernegon — design Stitch premium (hero fotográfico full-bleed).
 * Nav/footer vêm do layout `(public)`.
 */
export function BarbernegonLanding({ className = "" }: Props) {
  return (
    <div
      className={`${className} relative overflow-x-clip bg-[var(--ln-bg)] font-[family-name:var(--font-ln-body)] text-[var(--ln-on)] antialiased selection:bg-[var(--ln-primary-container)] selection:text-white`}
      style={themeVars}
    >
      <main className="relative z-10">
        <StitchHero />
        <StitchIdentity />
        <StitchSiteSection />
        <StitchIntelligence />
        <StitchFinalCta />
      </main>
    </div>
  );
}

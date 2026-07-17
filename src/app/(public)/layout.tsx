import type { CSSProperties, ReactNode } from "react";
import { Geist, Montserrat } from "next/font/google";

import { PublicBrandShell } from "@/components/brand/public-brand-shell";

const body = Geist({
  subsets: ["latin"],
  variable: "--font-ln-body",
  display: "swap",
});

const brandHeadline = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-brand-headline",
  display: "swap",
});

const fontAliases = {
  "--font-ln-headline": "var(--font-brand-headline)",
  "--font-explore-headline": "var(--font-brand-headline)",
} as CSSProperties;

/**
 * Layout compartilhado da superfície pública (landing + marketplace).
 * Mantém a nav montada entre navegações para transições profissionais.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${body.variable} ${brandHeadline.variable}`}
      style={fontAliases}
    >
      <PublicBrandShell>{children}</PublicBrandShell>
    </div>
  );
}

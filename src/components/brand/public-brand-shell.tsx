"use client";

import type { ReactNode } from "react";

import { BarbernegonFooter } from "@/components/brand/barbernegon-footer";
import { BarbernegonNav } from "@/components/brand/barbernegon-nav";
import { BrandPageTransition } from "@/components/brand/brand-page-transition";

type Props = {
  children: ReactNode;
};

/** Shell público: nav fixa + transição de página + footer. */
export function PublicBrandShell({ children }: Props) {
  return (
    <div className="brand-onyx min-h-svh bg-[var(--bn-bg)] text-[var(--bn-on)]">
      <BarbernegonNav />
      <BrandPageTransition>{children}</BrandPageTransition>
      <BarbernegonFooter />
    </div>
  );
}

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
    <div className="min-h-svh bg-[#10131a] text-[#e1e2ec]">
      <BarbernegonNav />
      <BrandPageTransition>{children}</BrandPageTransition>
      <BarbernegonFooter />
    </div>
  );
}

"use client";

import Link from "next/link";

import { marketplaceHomePath, publicSurfaceUrl } from "@/lib/public-hosts";

/** Footer público compartilhado (landing + marketplace). */
export function BarbernegonFooter() {
  return (
    <footer className="border-t border-[#2F3336] bg-[#0b0e15]">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center justify-between gap-6 px-4 py-8 sm:px-6 md:flex-row">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <Link
            href={publicSurfaceUrl("marketing", "/")}
            className="font-brand-headline text-xl font-bold text-[#e1e2ec]"
          >
            Barbernegon
          </Link>
          <p className="text-sm text-[#9CA3AF]">
            © {new Date().getFullYear()} Barbernegon. Excellence in Grooming.
          </p>
        </div>
        <nav className="flex flex-wrap justify-center gap-6 sm:gap-8">
          {(
            [
              [publicSurfaceUrl("marketing", "/"), "Home"],
              [marketplaceHomePath(), "Barbearias"],
              [publicSurfaceUrl("marketing", "/planos"), "Planos"],
              [publicSurfaceUrl("marketing", "/cadastro"), "Cadastro"],
            ] as const
          ).map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="text-xs font-bold tracking-[0.1em] text-[#9CA3AF] uppercase transition hover:text-[#e1e2ec]"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

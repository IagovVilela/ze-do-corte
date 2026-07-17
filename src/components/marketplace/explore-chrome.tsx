"use client";

import Link from "next/link";
import { Heart, Menu, Store, X } from "lucide-react";
import { useEffect, useState } from "react";

import { ExploreFavoritesLink } from "@/components/marketplace/explore-favorites-link";
import { marketplaceHomePath, publicSurfaceUrl } from "@/lib/public-hosts";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  /** Destaque visual no link Favoritos (página de favoritos). */
  favoritesActive?: boolean;
};

/** Header sticky + footer do marketplace (design Onyx & Azure). */
export function ExploreChrome({ children, favoritesActive }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="explore-onyx min-h-svh bg-[#10131a] text-[#e1e2ec]">
      <header
        className={cn(
          "sticky top-0 z-50 w-full border-b transition-all duration-300",
          scrolled
            ? "border-white/10 bg-[#10131a]/95 py-2 backdrop-blur-md"
            : "border-white/10 bg-[#10131a]/10 py-4 backdrop-blur-sm",
        )}
      >
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-4 sm:px-6">
          <Link
            href={marketplaceHomePath()}
            className="font-explore-headline text-xl font-bold tracking-tight text-[#e1e2ec] sm:text-2xl"
          >
            BarberNegon
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {favoritesActive ? (
              <Link
                href="/explorar/favoritos"
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-[#adc6ff]"
              >
                <Heart className="size-4 fill-current" />
                Favoritos
              </Link>
            ) : (
              <ExploreFavoritesLink className="text-xs font-bold uppercase tracking-[0.1em] text-[#c2c6d6] hover:text-[#adc6ff]" />
            )}
            <Link
              href={publicSurfaceUrl("marketing", "/cadastro")}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-[#c2c6d6] transition-colors hover:text-[#adc6ff]"
            >
              <Store className="size-4" />
              Para o salão
            </Link>
            <Link
              href={publicSurfaceUrl("marketing", "/admin/login")}
              className="rounded-lg bg-[#adc6ff] px-6 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#00285d] transition hover:brightness-110 active:scale-[0.97]"
            >
              Entrar
            </Link>
          </nav>

          <button
            type="button"
            className="rounded-lg p-2 text-[#e1e2ec] md:hidden"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>

        {menuOpen ? (
          <div className="border-t border-white/10 bg-[#10131a]/98 px-4 py-4 backdrop-blur-md md:hidden">
            <div className="flex flex-col gap-3">
              <Link
                href="/explorar/favoritos"
                onClick={() => setMenuOpen(false)}
                className="inline-flex items-center gap-2 py-2 text-sm font-semibold text-[#c2c6d6]"
              >
                <Heart className="size-4" />
                Favoritos
              </Link>
              <Link
                href={publicSurfaceUrl("marketing", "/cadastro")}
                onClick={() => setMenuOpen(false)}
                className="inline-flex items-center gap-2 py-2 text-sm font-semibold text-[#c2c6d6]"
              >
                <Store className="size-4" />
                Para o salão
              </Link>
              <Link
                href={publicSurfaceUrl("marketing", "/admin/login")}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg bg-[#adc6ff] px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.1em] text-[#00285d]"
              >
                Entrar
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      {children}

      <footer className="border-t border-[#2F3336] bg-[#0b0e15]">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center justify-between gap-6 px-4 py-8 sm:px-6 md:flex-row">
          <div className="flex flex-col items-center gap-2 md:items-start">
            <span className="font-explore-headline text-xl font-bold text-[#e1e2ec]">
              BarberNegon
            </span>
            <p className="text-sm text-[#9CA3AF]">
              © {new Date().getFullYear()} BarberNegon. Excellence in Grooming.
            </p>
          </div>
          <nav className="flex flex-wrap justify-center gap-6 sm:gap-8">
            <Link
              href={publicSurfaceUrl("marketing", "/planos")}
              className="text-xs font-bold uppercase tracking-[0.1em] text-[#9CA3AF] transition hover:text-[#e1e2ec]"
            >
              Planos
            </Link>
            <Link
              href={publicSurfaceUrl("marketing", "/cadastro")}
              className="text-xs font-bold uppercase tracking-[0.1em] text-[#9CA3AF] transition hover:text-[#e1e2ec]"
            >
              Cadastro
            </Link>
            <Link
              href={marketplaceHomePath()}
              className="text-xs font-bold uppercase tracking-[0.1em] text-[#9CA3AF] transition hover:text-[#e1e2ec]"
            >
              Explorar
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

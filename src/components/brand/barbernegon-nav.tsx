"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { BarbernegonMark } from "@/components/brand/barbernegon-mark";
import { ExploreFavoritesLink } from "@/components/marketplace/explore-favorites-link";
import { publicSurfaceUrl } from "@/lib/public-hosts";
import { cn } from "@/lib/utils";

export type BarbernegonNavActive =
  | "home"
  | "barbearias"
  | "favoritos"
  | "planos";

const homeHref = publicSurfaceUrl("marketing", "/");
const explorarHref = publicSurfaceUrl("marketplace", "/explorar");
const favoritosHref = publicSurfaceUrl("marketplace", "/explorar/favoritos");
const planosHref = publicSurfaceUrl("marketing", "/planos");
const loginHref = publicSurfaceUrl("marketing", "/admin/login");
const paraSalaoHref = `${publicSurfaceUrl("marketing", "/")}#operations`;

function LabelCaps({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-[11px] leading-none font-bold tracking-[0.1em] uppercase sm:text-[12px]",
        className,
      )}
    >
      {children}
    </span>
  );
}

function resolveActive(pathname: string | null): BarbernegonNavActive | null {
  if (!pathname) return null;
  if (pathname.startsWith("/explorar/favoritos")) return "favoritos";
  if (pathname.startsWith("/explorar")) return "barbearias";
  if (pathname.startsWith("/planos")) return "planos";
  if (pathname === "/") return "home";
  return null;
}

/**
 * Nav pública Barbernegon — persistente no layout `(public)`.
 */
export function BarbernegonNav() {
  const pathname = usePathname();
  const active = resolveActive(pathname);
  const reduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const showFavoritesCount = active === "barbearias";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const linkClass = (isActive: boolean) =>
    cn(
      "relative pb-1.5 transition-colors duration-200",
      isActive
        ? "border-b-2 border-[var(--bn-primary)] text-[var(--bn-primary)]"
        : "border-b-2 border-transparent text-[var(--bn-on-variant)] hover:text-[var(--bn-primary)]",
    );

  const mobileLinks = [
    [homeHref, "Home", active === "home"],
    [explorarHref, "Barbearias", active === "barbearias"],
    [favoritosHref, "Favoritos", active === "favoritos"],
    [planosHref, "Planos", active === "planos"],
    [paraSalaoHref, "Para o salão", false],
  ] as const;

  return (
    <header
      className={cn(
        "fixed top-0 right-0 left-0 z-50 border-b border-[var(--bn-border)]/80 bg-[var(--bn-bg)]/85 backdrop-blur-md transition-[padding,background-color] duration-300",
        "pt-[max(0.5rem,env(safe-area-inset-top))]",
        scrolled ? "pb-1.5" : "pb-2.5",
      )}
    >
      <nav className="mx-auto flex h-14 w-full max-w-[1280px] items-center justify-between gap-3 px-4 md:h-16 md:px-6">
        <BarbernegonMark
          href={homeHref}
          size={48}
          priority
          className="text-[var(--bn-on)]"
        />

        <div className="hidden items-center gap-7 lg:gap-8 md:flex">
          <Link href={homeHref} className={linkClass(active === "home")}>
            <LabelCaps>Home</LabelCaps>
          </Link>
          <Link
            href={explorarHref}
            className={linkClass(active === "barbearias")}
          >
            <LabelCaps>Barbearias</LabelCaps>
          </Link>
          {showFavoritesCount ? (
            <div className={linkClass(false)}>
              <ExploreFavoritesLink className="text-[12px] font-bold tracking-[0.1em] text-inherit uppercase hover:text-[var(--bn-primary)]" />
            </div>
          ) : (
            <Link
              href={favoritosHref}
              className={linkClass(active === "favoritos")}
            >
              <LabelCaps>Favoritos</LabelCaps>
            </Link>
          )}
          <Link href={planosHref} className={linkClass(active === "planos")}>
            <LabelCaps>Planos</LabelCaps>
          </Link>
          <Link href={paraSalaoHref} className={linkClass(false)}>
            <LabelCaps>Para o salão</LabelCaps>
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={loginHref}
            className="hidden rounded bg-[var(--bn-primary-container)] px-6 py-2 text-sm font-bold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.97] md:inline-flex"
          >
            Entrar
          </Link>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-lg text-[var(--bn-on)] transition-colors hover:bg-white/5 md:hidden"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </nav>

      <motion.div
        initial={false}
        animate={
          menuOpen
            ? { height: "auto", opacity: 1 }
            : { height: 0, opacity: 0 }
        }
        transition={{
          duration: reduceMotion ? 0 : 0.28,
          ease: [0.16, 1, 0.3, 1],
        }}
        className={cn(
          "overflow-hidden border-t border-[var(--bn-border)] bg-[var(--bn-bg)]/98 backdrop-blur-md md:hidden",
          !menuOpen && "pointer-events-none",
        )}
      >
        <div className="flex max-h-[min(70svh,28rem)] flex-col gap-1 overflow-y-auto px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {mobileLinks.map(([href, label, isActive]) => (
            <Link
              key={label}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "rounded-lg px-3 py-3.5 text-[15px] font-semibold transition-colors active:bg-white/10",
                isActive
                  ? "bg-white/5 text-[var(--bn-primary)]"
                  : "text-[var(--bn-on-variant)]",
              )}
            >
              {label}
            </Link>
          ))}
          <Link
            href={loginHref}
            onClick={() => setMenuOpen(false)}
            className="mt-2 rounded-lg bg-[var(--bn-primary-container)] px-3 py-3.5 text-center text-[15px] font-bold text-white transition hover:brightness-110 active:scale-[0.98]"
          >
            Entrar
          </Link>
        </div>
      </motion.div>
    </header>
  );
}

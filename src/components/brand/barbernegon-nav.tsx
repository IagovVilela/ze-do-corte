"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { ExploreFavoritesLink } from "@/components/marketplace/explore-favorites-link";
import { publicSurfaceUrl } from "@/lib/public-hosts";
import { cn } from "@/lib/utils";

export type BarbernegonNavActive = "home" | "barbearias" | "favoritos";

const homeHref = publicSurfaceUrl("marketing", "/");
const explorarHref = publicSurfaceUrl("marketplace", "/explorar");
const favoritosHref = publicSurfaceUrl("marketplace", "/explorar/favoritos");
const cadastroHref = publicSurfaceUrl("marketing", "/cadastro");
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
        "text-[12px] leading-none font-bold tracking-[0.1em] uppercase",
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
  if (pathname === "/") return "home";
  return null;
}

/**
 * Nav pública Barbernegon — persistente no layout `(public)`.
 * Mesmo visual em Home, Barbearias e Favoritos.
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const linkClass = (isActive: boolean) =>
    cn(
      "relative pb-1 transition-colors duration-200",
      isActive ? "text-[#adc6ff]" : "text-[#c2c6d6] hover:text-[#adc6ff]",
    );

  return (
    <header
      className={cn(
        "fixed top-0 right-0 left-0 z-50 border-b border-[#2F3336]/80 bg-[#10131a]/80 backdrop-blur-md transition-[padding,background-color] duration-300",
        scrolled ? "py-2" : "py-3.5",
      )}
    >
      <nav className="mx-auto flex h-12 w-full max-w-[1280px] items-center justify-between px-4 md:h-14 md:px-6">
        <Link
          href={homeHref}
          className="font-brand-headline text-xl font-bold tracking-tight text-[#e1e2ec] transition-opacity hover:opacity-90 md:text-2xl"
        >
          Barbernegon
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link href={homeHref} className={linkClass(active === "home")}>
            <LabelCaps>Home</LabelCaps>
            {active === "home" ? (
              <motion.span
                layoutId="brand-nav-underline"
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#adc6ff]"
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 380, damping: 30 }
                }
              />
            ) : null}
          </Link>
          <Link
            href={explorarHref}
            className={linkClass(active === "barbearias")}
          >
            <LabelCaps>Barbearias</LabelCaps>
            {active === "barbearias" ? (
              <motion.span
                layoutId="brand-nav-underline"
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#adc6ff]"
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 380, damping: 30 }
                }
              />
            ) : null}
          </Link>
          {showFavoritesCount ? (
            <div className={linkClass(false)}>
              <ExploreFavoritesLink className="text-[12px] font-bold tracking-[0.1em] text-inherit uppercase hover:text-[#adc6ff]" />
            </div>
          ) : (
            <Link
              href={favoritosHref}
              className={linkClass(active === "favoritos")}
            >
              <LabelCaps>Favoritos</LabelCaps>
              {active === "favoritos" ? (
                <motion.span
                  layoutId="brand-nav-underline"
                  className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#adc6ff]"
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 380, damping: 30 }
                  }
                />
              ) : null}
            </Link>
          )}
          <Link href={paraSalaoHref} className={linkClass(false)}>
            <LabelCaps>Para o salão</LabelCaps>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href={loginHref}
            className="rounded bg-[#3B82F6] px-5 py-2 text-sm font-bold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.97] sm:px-6"
          >
            Entrar
          </Link>
          <button
            type="button"
            className="rounded-lg p-2 text-[#e1e2ec] transition-colors hover:bg-white/5 md:hidden"
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
        transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden border-t border-[#2F3336] bg-[#10131a]/98 backdrop-blur-md md:hidden"
      >
        <div className="flex flex-col gap-1 px-4 py-3">
          {(
            [
              [homeHref, "Home", active === "home"],
              [explorarHref, "Barbearias", active === "barbearias"],
              [favoritosHref, "Favoritos", active === "favoritos"],
              [paraSalaoHref, "Para o salão", false],
            ] as const
          ).map(([href, label, isActive]) => (
            <Link
              key={label}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "rounded-lg px-3 py-3 text-sm font-semibold transition-colors",
                isActive ? "bg-white/5 text-[#adc6ff]" : "text-[#c2c6d6]",
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </motion.div>
    </header>
  );
}

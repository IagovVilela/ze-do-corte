"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { AnimatedText } from "@/components/animated-text";
import { InstagramIcon, WhatsappIcon } from "@/components/icons";
import {
  getInstagramContactHref,
  getWhatsappContactHref,
} from "@/lib/contact-links";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { cn } from "@/lib/utils";

const publicLinks = [
  { href: "/", label: "Início" },
  { href: "/#servicos", label: "Serviços" },
  { href: "/#equipe", label: "Equipe" },
  { href: "/#contato", label: "Contato" },
  { href: "/agendar", label: "Agendar" },
] as const;

const linkClassDesktop =
  "rounded-full px-2.5 py-1.5 text-sm text-zinc-200 transition-colors hover:bg-white/10 hover:text-white md:px-3";

function NavbarSocialLinks({ className }: { className?: string }) {
  const wa = getWhatsappContactHref();
  const ig = getInstagramContactHref();
  if (!wa && !ig) return null;

  const iconBtn =
    "flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-zinc-200 shadow-sm shadow-black/20 transition hover:border-brand-400/50 hover:bg-brand-500/10 hover:text-brand-100 md:h-9 md:w-9";

  return (
    <div
      className={
        className ??
        "mr-1 flex items-center gap-1.5 border-white/10 md:mr-2 md:border-r md:pr-3"
      }
    >
      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className={iconBtn}
          aria-label="WhatsApp"
        >
          <WhatsappIcon className="h-[18px] w-[18px]" aria-hidden />
        </a>
      ) : null}
      {ig ? (
        <a
          href={ig}
          target="_blank"
          rel="noopener noreferrer"
          className={iconBtn}
          aria-label="Instagram"
        >
          <InstagramIcon className="h-[18px] w-[18px]" aria-hidden />
        </a>
      ) : null}
    </div>
  );
}

function PublicNavLinks() {
  return (
    <div className="contents">
      {publicLinks.map((link) => (
        <motion.div
          key={link.href}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.18 }}
        >
          <Link href={link.href} className={linkClassDesktop}>
            {link.label}
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

const mobileOverlayTransition = { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const };
const mobileContentTransition = { type: "spring", stiffness: 280, damping: 32 } as const;

function MobileMenuOverlay({
  open,
  onClose,
  trailing,
  menuId,
  reduceMotion,
}: {
  open: boolean;
  onClose: () => void;
  trailing: ReactNode;
  menuId: string;
  reduceMotion: boolean | null;
}) {
  const close = useCallback(() => onClose(), [onClose]);
  const instant = reduceMotion === true;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const listVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: instant ? 0 : 0.055,
        delayChildren: instant ? 0 : 0.12,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: instant ? 1 : 0,
      y: instant ? 0 : 28,
    },
    show: {
      opacity: 1,
      y: 0,
      transition: instant ? { duration: 0 } : mobileContentTransition,
    },
  };

  const footerVariants = {
    hidden: { opacity: instant ? 1 : 0, y: instant ? 0 : 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: instant
        ? { duration: 0 }
        : { ...mobileContentTransition, delay: 0.35 },
    },
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="nav-mobile-root"
          className="fixed inset-0 z-[200] isolate md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={instant ? { duration: 0.15 } : mobileOverlayTransition}
        >
          <motion.button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-zinc-950/95 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: instant ? 0.12 : 0.32 }}
            onClick={close}
          />

          <motion.div
            id={menuId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${menuId}-label`}
            className="pointer-events-none absolute inset-0 flex flex-col bg-zinc-950"
            initial={instant ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={instant ? { opacity: 0 } : { opacity: 0, transition: { duration: 0.22 } }}
          >
            {/* Camadas decorativas (não bloqueiam cliques nos filhos com pointer-events) */}
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_-10%,rgba(250,204,21,0.14),transparent_58%),radial-gradient(ellipse_80%_55%_at_110%_40%,rgba(59,130,246,0.06),transparent_55%),radial-gradient(ellipse_60%_45%_at_-10%_80%,rgba(250,204,21,0.05),transparent_50%)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-300/50 to-transparent"
              aria-hidden
            />

            <div className="pointer-events-auto relative flex min-h-[100dvh] flex-col bg-zinc-950/80 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
              <div className="flex items-start justify-between gap-3">
                <motion.div
                  className="flex min-w-0 items-center gap-3 pt-1"
                  initial={instant ? false : { opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={instant ? { duration: 0 } : { ...mobileContentTransition, delay: 0.05 }}
                >
                  <BrandLogo size={48} className="h-12 w-12 shrink-0 shadow-lg shadow-brand-500/15 ring-1 ring-white/10" />
                  <div className="min-w-0">
                    <p id={`${menuId}-label`} className="font-display text-lg font-semibold tracking-wide text-white">
                      Zé do Corte
                    </p>
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-200/90">
                      Navegue
                    </p>
                  </div>
                </motion.div>

                <motion.button
                  type="button"
                  onClick={close}
                  aria-label="Fechar"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] text-white shadow-lg shadow-black/30 backdrop-blur-md transition hover:border-brand-400/35 hover:bg-brand-500/15 hover:text-brand-50"
                  initial={instant ? false : { opacity: 0, scale: 0.85, rotate: -90 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={instant ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 22, delay: 0.08 }}
                  whileTap={{ scale: 0.92 }}
                >
                  <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                </motion.button>
              </div>

              <nav className="mt-10 flex flex-1 flex-col justify-center" aria-label="Principal">
                <motion.ul
                  className="flex flex-col gap-1"
                  variants={listVariants}
                  initial="hidden"
                  animate="show"
                >
                  {publicLinks.map((link) => (
                    <motion.li key={link.href} variants={itemVariants}>
                      <Link
                        href={link.href}
                        onClick={close}
                        className="group relative block overflow-hidden rounded-2xl border border-transparent px-1 py-2 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
                      >
                        <span className="font-display text-[clamp(1.65rem,7vw,2.35rem)] font-semibold leading-none tracking-tight text-white transition group-hover:text-brand-100">
                          {link.label}
                        </span>
                        <span
                          className="mt-2 block h-px max-w-[4.5rem] origin-left scale-x-0 bg-gradient-to-r from-brand-400 to-brand-600 transition duration-300 group-hover:scale-x-100"
                          aria-hidden
                        />
                      </Link>
                    </motion.li>
                  ))}
                </motion.ul>
              </nav>

              <motion.div
                className="mt-8 space-y-5 border-t border-white/10 pt-6"
                variants={footerVariants}
                initial="hidden"
                animate="show"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                    Redes
                  </p>
                  <NavbarSocialLinks className="flex items-center gap-2" />
                </div>
                <div
                  className="[&>div]:w-full [&_a]:min-h-[3.25rem] [&_a]:w-full [&_a]:justify-center [&_a]:rounded-2xl [&_a]:border [&_a]:border-brand-300/50 [&_a]:bg-gradient-to-r [&_a]:from-brand-300 [&_a]:via-brand-400 [&_a]:to-brand-500 [&_a]:px-6 [&_a]:text-base [&_a]:font-semibold [&_a]:text-zinc-950 [&_a]:shadow-[0_14px_44px_-10px_rgba(250,204,21,0.55)] [&_a]:transition [&_a]:hover:brightness-[1.07]"
                  onClick={close}
                >
                  {trailing}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function NavbarChrome({ trailing }: { trailing: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const menuId = useId();
  const { direction, pastTop } = useScrollDirection({ threshold: 14, topMargin: 72 });

  /** Esconder quando rola para baixo E não está no topo E menu mobile fechado. */
  const hidden = direction === "down" && pastTop && !mobileOpen;

  useEffect(() => {
    setPortalReady(true);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <motion.div
        initial={reduceMotion ? false : { y: -32, opacity: 0 }}
        animate={
          reduceMotion
            ? false
            : {
                y: hidden ? "-100%" : 0,
                opacity: 1,
              }
        }
        transition={
          hidden
            ? { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
            : { duration: 0.45, ease: [0.16, 1, 0.3, 1] }
        }
        className={cn(
          "transition-[background-color,border-color,backdrop-filter] duration-300",
          pastTop
            ? "border-b border-white/10 bg-brand-950/85 backdrop-blur-xl shadow-lg shadow-black/10"
            : "border-b border-transparent bg-brand-950/40 backdrop-blur-sm",
        )}
      >
      <div className="container-max flex min-h-14 items-center justify-between gap-2 py-2 sm:h-16 sm:py-0 md:gap-3">
        <Link
          href="/"
          className="flex min-w-0 shrink items-center gap-2 font-semibold tracking-wide transition-opacity hover:opacity-90 sm:gap-2.5"
        >
          <BrandLogo size={38} priority className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
          <span className="truncate text-sm text-white sm:text-base">Zé do Corte</span>
        </Link>

        <nav className="hidden min-w-0 flex-nowrap items-center justify-end gap-1 md:flex md:gap-2 lg:gap-3">
          <NavbarSocialLinks />
          <PublicNavLinks />
          {trailing}
        </nav>

        <div className="flex shrink-0 items-center md:hidden">
          <motion.button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-zinc-100 shadow-sm shadow-black/20 backdrop-blur-sm transition hover:border-brand-400/40 hover:bg-brand-500/10"
            aria-expanded={mobileOpen}
            aria-controls={mobileOpen ? menuId : undefined}
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMobileOpen((o) => !o)}
            whileTap={{ scale: 0.94 }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {mobileOpen ? (
                <motion.span
                  key="icon-x"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.22 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <X className="h-5 w-5" aria-hidden />
                </motion.span>
              ) : (
                <motion.span
                  key="icon-menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.22 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Menu className="h-5 w-5" aria-hidden />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
      </motion.div>

      {portalReady
        ? createPortal(
            <MobileMenuOverlay
              open={mobileOpen}
              onClose={() => setMobileOpen(false)}
              trailing={trailing}
              menuId={menuId}
              reduceMotion={reduceMotion}
            />,
            document.body,
          )
        : null}
    </header>
  );
}

const painelBtn =
  "inline-flex rounded-full border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 md:px-3 md:py-1.5";

/** Link para login do painel (senha no banco de dados). */
export function NavbarPainelTrailing() {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.18 }}
      className="w-full md:w-auto"
    >
      <Link href="/admin/login" className={`${painelBtn} w-full justify-center md:w-auto`}>
        Painel
      </Link>
    </motion.div>
  );
}

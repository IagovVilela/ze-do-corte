"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { InstagramIcon, WhatsappIcon } from "@/components/icons";
import {
  getInstagramContactHref,
  getWhatsappContactHref,
} from "@/lib/contact-links";

const publicLinks = [
  { href: "/", label: "Início" },
  { href: "/#servicos", label: "Serviços" },
  { href: "/#equipe", label: "Equipe" },
  { href: "/#contato", label: "Contato" },
  { href: "/agendar", label: "Agendar" },
] as const;

const linkClassDesktop =
  "rounded-full px-2.5 py-1.5 text-sm text-zinc-200 transition-colors hover:bg-white/10 hover:text-white md:px-3";

const linkClassMobile =
  "block rounded-xl px-4 py-3 text-base font-medium text-zinc-100 transition-colors hover:bg-white/10 active:bg-white/15";

function NavbarSocialLinks({ className }: { className?: string }) {
  const wa = getWhatsappContactHref();
  const ig = getInstagramContactHref();
  if (!wa && !ig) return null;

  const iconBtn =
    "flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-zinc-200 transition hover:border-brand-500/40 hover:bg-white/[0.08] hover:text-white md:h-9 md:w-9";

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

function PublicNavLinks({
  onLinkClick,
  variant,
}: {
  onLinkClick?: () => void;
  variant: "desktop" | "mobile";
}) {
  const cls = variant === "desktop" ? linkClassDesktop : linkClassMobile;
  const wrapClass =
    variant === "desktop"
      ? "contents"
      : "flex flex-col gap-0.5 border-t border-white/10 pt-4";

  return (
    <div className={wrapClass}>
      {publicLinks.map((link) => (
        <motion.div
          key={link.href}
          whileHover={variant === "desktop" ? { y: -2 } : undefined}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.18 }}
        >
          <Link href={link.href} className={cls} onClick={onLinkClick}>
            {link.label}
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

function MobileMenu({
  open,
  onClose,
  trailing,
  menuId,
}: {
  open: boolean;
  onClose: () => void;
  trailing: ReactNode;
  menuId: string;
}) {
  const close = useCallback(() => onClose(), [onClose]);

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        aria-label="Fechar menu"
        onClick={close}
      />
      <div
        id={menuId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${menuId}-title`}
        className="absolute right-0 top-0 flex h-[100dvh] w-[min(20rem,100%)] flex-col border-l border-white/10 bg-brand-950/98 px-4 pb-6 pt-[calc(0.75rem+env(safe-area-inset-top))] shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <p id={`${menuId}-title`} className="text-sm font-semibold tracking-wide text-white">
            Menu
          </p>
          <button
            type="button"
            onClick={close}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-zinc-200 transition hover:bg-white/10"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <NavbarSocialLinks className="flex items-center gap-2" />
        </div>
        <nav className="mt-2 flex flex-1 flex-col overflow-y-auto">
          <PublicNavLinks variant="mobile" onLinkClick={close} />
          <div className="mt-4 border-t border-white/10 pt-4" onClick={close}>
            {trailing}
          </div>
        </nav>
      </div>
    </div>
  );
}

export function NavbarChrome({ trailing }: { trailing: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuId = useId();

  return (
    <motion.header
      initial={reduceMotion ? false : { y: -32, opacity: 0 }}
      animate={reduceMotion ? false : { y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-40 border-b border-white/10 bg-brand-950/80 backdrop-blur-xl"
    >
      <div className="container-max flex min-h-14 items-center justify-between gap-2 py-2 sm:h-16 sm:py-0 md:gap-3">
        <Link
          href="/"
          className="flex min-w-0 shrink items-center gap-2 font-semibold tracking-wide transition-opacity hover:opacity-90 sm:gap-2.5"
        >
          <BrandLogo size={38} priority className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />
          <span className="truncate text-sm text-white sm:text-base">Zé do Corte</span>
        </Link>

        {/* Desktop / tablet: linha única, sem quebra */}
        <nav className="hidden min-w-0 flex-nowrap items-center justify-end gap-1 md:flex md:gap-2 lg:gap-3">
          <NavbarSocialLinks />
          <PublicNavLinks variant="desktop" />
          {trailing}
        </nav>

        {/* Mobile: só ícone menu */}
        <div className="flex shrink-0 items-center md:hidden">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-zinc-100 transition hover:bg-white/10"
            aria-expanded={mobileOpen}
            aria-controls={mobileOpen ? menuId : undefined}
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <MobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        trailing={trailing}
        menuId={menuId}
      />
    </motion.header>
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

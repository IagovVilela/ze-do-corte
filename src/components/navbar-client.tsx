"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
];

function NavbarSocialLinks() {
  const wa = getWhatsappContactHref();
  const ig = getInstagramContactHref();
  if (!wa && !ig) return null;

  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-zinc-200 transition hover:border-brand-500/40 hover:bg-white/[0.08] hover:text-white";

  return (
    <div className="mr-1 flex items-center gap-1.5 border-white/10 md:mr-2 md:border-r md:pr-3">
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
    <>
      {publicLinks.map((link) => (
        <motion.div
          key={link.href}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.18 }}
        >
          <Link
            href={link.href}
            className="rounded-full px-2.5 py-1.5 text-sm text-zinc-200 transition-colors hover:bg-white/10 hover:text-white md:px-3"
          >
            {link.label}
          </Link>
        </motion.div>
      ))}
    </>
  );
}

export function NavbarChrome({ trailing }: { trailing: ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.header
      initial={reduceMotion ? false : { y: -32, opacity: 0 }}
      animate={reduceMotion ? false : { y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-40 border-b border-white/10 bg-brand-950/80 backdrop-blur-xl"
    >
      <div className="container-max flex h-16 items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-semibold tracking-wide transition-opacity hover:opacity-90"
        >
          <BrandLogo size={38} priority className="h-9 w-9" />
          <span className="text-white">Zé do Corte</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1 md:gap-3">
          <NavbarSocialLinks />
          <PublicNavLinks />
          {trailing}
        </nav>
      </div>
    </motion.header>
  );
}

const painelBtn =
  "rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/10";

/** Link para login do painel (senha no banco de dados). */
export function NavbarPainelTrailing() {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.18 }}
    >
      <Link href="/admin/login" className={painelBtn}>
        Painel
      </Link>
    </motion.div>
  );
}

"use client";

import type { ReactNode } from "react";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";

const publicLinks = [
  { href: "/", label: "Início" },
  { href: "/#servicos", label: "Serviços" },
  { href: "/#contato", label: "Contato" },
  { href: "/agendar", label: "Agendar" },
];

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

function NavbarShell({ children }: { children: ReactNode }) {
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
          <PublicNavLinks />
          {children}
        </nav>
      </div>
    </motion.header>
  );
}

/** Sem ClerkProvider: não usar hooks do Clerk. */
function NavbarWithoutClerk() {
  return (
    <NavbarShell>
      <motion.div
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.18 }}
      >
        <Link
          href="/admin"
          className="rounded-full px-2.5 py-1.5 text-sm text-brand-200 transition-colors hover:bg-brand-500/15 md:px-3"
        >
          Admin
        </Link>
      </motion.div>
      <span className="hidden text-xs text-zinc-500 sm:inline">(dev sem Clerk)</span>
    </NavbarShell>
  );
}

function NavbarWithClerk() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <NavbarShell>
      {isLoaded && isSignedIn ? (
        <>
          <motion.div
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.18 }}
          >
            <Link
              href="/admin"
              className="rounded-full px-2.5 py-1.5 text-sm text-brand-200 transition-colors hover:bg-brand-500/15 md:px-3"
            >
              Admin
            </Link>
          </motion.div>
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-8 w-8 ring-1 ring-white/20",
              },
            }}
          />
        </>
      ) : null}
      {isLoaded && !isSignedIn ? (
        <SignInButton mode="redirect">
          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Entrar
          </motion.button>
        </SignInButton>
      ) : null}
    </NavbarShell>
  );
}

type Props = {
  clerkEnabled: boolean;
};

export function NavbarClient({ clerkEnabled }: Props) {
  if (!clerkEnabled) {
    return <NavbarWithoutClerk />;
  }
  return <NavbarWithClerk />;
}

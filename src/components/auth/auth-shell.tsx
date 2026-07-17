"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  /** Painel lateral de marca (split desktop, foto full-bleed). */
  aside?: ReactNode;
  /** Banner compacto sobre a foto no mobile (só no modo split). */
  mobileBanner?: ReactNode;
};

const AUTH_IMAGE = "/images/landing/hero-barbershop.png";

/**
 * Shell visual das telas de auth (login + cadastro).
 * Sem `aside`: painel centrado. Com `aside`: split full-bleed com foto.
 */
export function AuthShell({ children, className, aside, mobileBanner }: Props) {
  const reduceMotion = useReducedMotion();

  if (!aside) {
    return (
      <div
        className={cn(
          "relative min-h-svh overflow-x-clip bg-[#10131a] text-[#e1e2ec] antialiased",
          className,
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(59,130,246,0.26),transparent_55%),radial-gradient(ellipse_45%_35%_at_95%_15%,rgba(173,198,255,0.10),transparent_50%)]"
        />

        <div className="relative z-10 flex min-h-svh flex-col">
          <header className="flex items-center px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 sm:px-6 md:px-10">
            <Link
              href="/"
              className="font-[family-name:var(--font-auth-headline)] text-xl font-bold tracking-tight text-[#e1e2ec] transition hover:opacity-90 sm:text-2xl"
            >
              Barbernegon
            </Link>
          </header>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-14">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              {children}
            </motion.div>
          </div>

          <footer className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-xs text-[#9CA3AF] sm:px-6">
            © {new Date().getFullYear()} Barbernegon
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative min-h-svh overflow-x-clip bg-[#10131a] text-[#e1e2ec] antialiased lg:grid lg:grid-cols-[1.1fr_1fr]",
        className,
      )}
    >
      {/* Painel de marca — foto full-bleed (desktop) */}
      <motion.aside
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative hidden overflow-hidden lg:flex lg:min-h-svh lg:flex-col lg:justify-between"
      >
        <Image
          src={AUTH_IMAGE}
          alt="Interior premium de barbearia"
          fill
          priority
          className="object-cover"
          sizes="(min-width: 1024px) 55vw, 0px"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-[#10131a] via-[#10131a]/55 to-[#10131a]/25"
        />
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 w-40 bg-gradient-to-r from-transparent to-[#10131a]"
        />

        <header className="relative z-10 px-8 pt-[max(1.5rem,env(safe-area-inset-top))] xl:px-12">
          <Link
            href="/"
            className="font-[family-name:var(--font-auth-headline)] text-2xl font-bold tracking-tight text-white transition hover:opacity-90"
          >
            Barbernegon
          </Link>
        </header>

        <div className="relative z-10 px-8 pb-10 xl:px-12 xl:pb-14">
          {aside}
        </div>
      </motion.aside>

      {/* Coluna do formulário */}
      <div className="relative flex min-h-svh flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_45%_at_50%_-5%,rgba(59,130,246,0.18),transparent_60%)]"
        />

        {/* Marca no mobile (a foto vira banner) */}
        <header className="relative z-10 flex items-center px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 sm:px-6 lg:hidden">
          <Link
            href="/"
            className="font-[family-name:var(--font-auth-headline)] text-xl font-bold tracking-tight text-[#e1e2ec] transition hover:opacity-90 sm:text-2xl"
          >
            Barbernegon
          </Link>
        </header>

        {mobileBanner ? (
          <div className="relative z-10 mx-4 mt-2 overflow-hidden rounded-xl border border-[#2F3336] sm:mx-6 lg:hidden">
            <Image
              src={AUTH_IMAGE}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-r from-[#10131a]/92 via-[#10131a]/72 to-[#10131a]/45"
            />
            <div className="relative z-10 p-5">{mobileBanner}</div>
          </div>
        ) : null}

        <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-8 sm:px-6 lg:px-10 xl:px-14">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.42,
              ease: [0.16, 1, 0.3, 1],
              delay: reduceMotion ? 0 : 0.08,
            }}
            className="w-full"
          >
            {children}
          </motion.div>
        </div>

        <footer className="relative z-10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-xs text-[#9CA3AF] sm:px-6">
          © {new Date().getFullYear()} Barbernegon
        </footer>
      </div>
    </div>
  );
}

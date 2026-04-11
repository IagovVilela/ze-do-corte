"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { BARBER_SLOGAN_PRIMARY, BARBER_SLOGAN_SECONDARY } from "@/lib/constants";

const STORAGE_KEY = "ze-docorte-home-entrance-v1";

type Props = {
  children: React.ReactNode;
};

export function HomeEntrance({ children }: Props) {
  const reduceMotion = useReducedMotion();
  const [showIntro, setShowIntro] = useState(true);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    if (reduceMotion) {
      setShowIntro(false);
      return;
    }
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") {
        setShowIntro(false);
      }
    } catch {
      setShowIntro(false);
    }
  }, [reduceMotion]);

  const finishIntro = useCallback(() => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* private mode */
    }
    setShowIntro(false);
  }, []);

  useEffect(() => {
    if (!showIntro || reduceMotion) return;
    autoTimerRef.current = setTimeout(finishIntro, 3400);
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [showIntro, reduceMotion, finishIntro]);

  useEffect(() => {
    if (!showIntro) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showIntro]);

  return (
    <>
      <motion.div
        className="relative min-h-0"
        initial={false}
        animate={
          showIntro && !reduceMotion
            ? {
                opacity: 0.22,
                scale: 0.97,
                filter: "blur(12px)",
              }
            : {
                opacity: 1,
                scale: 1,
                filter: "blur(0px)",
              }
        }
        transition={{
          duration: 0.9,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {children}
      </motion.div>

      <AnimatePresence mode="wait">
        {showIntro && !reduceMotion ? (
          <motion.div
            key="home-intro"
            role="dialog"
            aria-modal="true"
            aria-labelledby="entrance-title"
            aria-describedby="entrance-desc"
            initial={{ opacity: 1 }}
            exit={{
              opacity: 0,
              transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
            }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#030304] px-6"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-70"
              style={{
                background:
                  "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(250, 204, 21, 0.18), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(59, 130, 246, 0.08), transparent), radial-gradient(ellipse 50% 50% at 0% 80%, rgba(250, 204, 21, 0.06), transparent)",
              }}
            />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              }}
            />

            <motion.div
              initial={{ scale: 0.82, opacity: 0, filter: "blur(16px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            >
              <BrandLogo size={120} priority className="h-28 w-28 shadow-2xl shadow-brand-500/20 md:h-32 md:w-32" />
            </motion.div>

            <motion.h1
              id="entrance-title"
              className="font-display mt-10 max-w-lg text-center text-4xl tracking-[0.08em] text-white uppercase md:text-6xl"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              Zé do Corte
            </motion.h1>

            <motion.p
              id="entrance-desc"
              className="mt-3 max-w-md text-center text-xs font-medium tracking-[0.28em] text-brand-300 uppercase sm:tracking-[0.35em]"
              initial={{ opacity: 0, letterSpacing: "0.45em" }}
              animate={{ opacity: 1, letterSpacing: "0.28em" }}
              transition={{ duration: 0.8, delay: 0.55 }}
            >
              {BARBER_SLOGAN_PRIMARY}
            </motion.p>

            <motion.p
              className="mt-8 max-w-md text-center text-sm leading-relaxed text-zinc-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.5 }}
            >
              Bem-vindo. {BARBER_SLOGAN_SECONDARY}
            </motion.p>

            <motion.div
              className="mt-10 h-px w-32 bg-gradient-to-r from-transparent via-brand-500/80 to-transparent"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: 1.05, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            />

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.45 }}
              className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
            >
              <motion.button
                type="button"
                onClick={finishIntro}
                className="rounded-full bg-brand-500 px-8 py-3 text-sm font-bold tracking-wide text-zinc-950 uppercase shadow-lg shadow-brand-500/25"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
              >
                Entrar no site
              </motion.button>
              <button
                type="button"
                onClick={finishIntro}
                className="text-xs font-medium tracking-wider text-zinc-500 uppercase underline-offset-4 transition hover:text-zinc-300 hover:underline"
              >
                Pular introdução
              </button>
            </motion.div>

            <motion.p
              aria-hidden
              className="absolute bottom-8 text-[10px] tracking-[0.25em] text-zinc-600 uppercase"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              transition={{ delay: 1.5, duration: 0.5 }}
            >
              São José dos Campos
            </motion.p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

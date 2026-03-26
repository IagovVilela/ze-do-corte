"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowRight, CalendarClock, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef } from "react";

import { HeroBackdropVideo } from "@/components/hero-video";
import { HeroStudioPanel } from "@/components/hero-studio-panel";
import { BARBER_SLOGAN_PRIMARY } from "@/lib/constants";
import { fadeUpSmall, staggerContainer, titleWord } from "@/lib/motion-presets";

const h1LineVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.055, delayChildren: 0.06 },
  },
};

/** Parte em caps do H1; o destaque em gradiente é `BARBER_HERO_TITLE_ACCENT`. */
const BARBER_HERO_TITLE_LEAD_WORDS = ["Experiências", "única", "para"] as const;
const BARBER_HERO_TITLE_ACCENT = "homens únicos";

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const parallaxX = useSpring(useTransform(mouseX, [-0.5, 0.5], [-12, 12]), {
    stiffness: 90,
    damping: 18,
  });
  const parallaxY = useSpring(useTransform(mouseY, [-0.5, 0.5], [-8, 8]), {
    stiffness: 90,
    damping: 18,
  });

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      mouseX.set((e.clientX - r.left) / r.width - 0.5);
      mouseY.set((e.clientY - r.top) / r.height - 0.5);
    },
    [mouseX, mouseY],
  );

  const onMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  const shellClass =
    "relative isolate min-h-[calc(100svh-4rem)] w-full overflow-hidden pt-20 pb-14 md:min-h-[min(92svh,920px)] md:pb-20";

  const innerClass =
    "container-max relative z-10 mx-auto flex min-h-[min(72svh,560px)] flex-col justify-end gap-10 px-4 pb-2 pt-8 md:min-h-[min(68svh,620px)] md:flex-row md:items-end md:justify-between md:gap-12 md:pt-16";

  if (reduceMotion) {
    return (
      <section ref={ref} className={shellClass}>
        <HeroBackdropVideo scrollTargetRef={ref} />
        <div className={innerClass}>
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-4 py-2 text-xs font-semibold tracking-[0.2em] text-zinc-200 backdrop-blur-sm uppercase">
              <Sparkles className="h-3.5 w-3.5 text-brand-300" aria-hidden />
              {BARBER_SLOGAN_PRIMARY}
            </div>
            <h1 className="font-display max-w-2xl text-5xl leading-[0.95] tracking-wide text-white [text-shadow:0_2px_40px_rgba(0,0,0,0.65)] uppercase sm:text-6xl md:text-7xl">
              {BARBER_HERO_TITLE_LEAD_WORDS.join(" ")}{" "}
              <span className="heading-gradient normal-case">{BARBER_HERO_TITLE_ACCENT}</span>.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-zinc-200 md:text-lg">
              Agende pelo site, escolha seu serviço e chegue no horário — atendimento de alto padrão em
              São José dos Campos.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/agendar"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-zinc-950 transition hover:bg-brand-300"
              >
                <CalendarClock className="h-4 w-4" aria-hidden />
                Agendar agora
              </Link>
              <a
                href="#servicos"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
              >
                Ver serviços
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>
          <div className="w-full shrink-0 md:max-w-md lg:max-w-[420px]">
            <HeroStudioPanel />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={shellClass}
    >
      <HeroBackdropVideo scrollTargetRef={ref} />

      <div className={innerClass}>
        <motion.div
          style={{ x: parallaxX, y: parallaxY }}
          className="max-w-2xl space-y-6"
          variants={staggerContainer(0.1, 0.04)}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            variants={fadeUpSmall}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-4 py-2 text-xs font-semibold tracking-[0.25em] text-zinc-200 backdrop-blur-md uppercase"
          >
            <motion.span
              animate={{ rotate: [0, 12, -8, 0], scale: [1, 1.08, 1] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                repeatDelay: 5,
                ease: "easeInOut",
              }}
            >
              <Sparkles className="h-3.5 w-3.5 text-brand-300" aria-hidden />
            </motion.span>
            {BARBER_SLOGAN_PRIMARY}
          </motion.div>

          <motion.h1
            className="font-display max-w-2xl text-5xl leading-[0.95] tracking-wide text-white [text-shadow:0_2px_48px_rgba(0,0,0,0.7)] uppercase sm:text-6xl md:text-7xl"
            variants={h1LineVariants}
          >
            {BARBER_HERO_TITLE_LEAD_WORDS.map((word, i) => (
              <span key={word + i} className="inline-block overflow-hidden align-baseline">
                <motion.span
                  className="inline-block font-display uppercase tracking-wide"
                  variants={titleWord}
                >
                  {word}
                  {i < BARBER_HERO_TITLE_LEAD_WORDS.length - 1 ? "\u00A0" : ""}
                </motion.span>
              </span>
            ))}
            <span className="inline-block overflow-hidden align-baseline">
              <motion.span
                className="heading-gradient inline-block normal-case"
                variants={titleWord}
              >
                {"\u00A0"}
                {BARBER_HERO_TITLE_ACCENT}
              </motion.span>
            </span>
            <span className="inline-block overflow-hidden align-baseline">
              <motion.span
                className="inline-block font-display uppercase tracking-wide"
                variants={titleWord}
              >
                .
              </motion.span>
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUpSmall}
            className="max-w-xl text-base leading-relaxed text-zinc-200 md:text-lg"
          >
            Agende pelo site, escolha seu serviço e chegue no horário — atendimento de alto padrão em
            São José dos Campos.
          </motion.p>

          <motion.div variants={fadeUpSmall} className="flex flex-col gap-3 sm:flex-row">
            <motion.div
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
            >
              <Link
                href="/agendar"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-zinc-950 shadow-lg shadow-black/40 transition hover:bg-brand-300"
              >
                <motion.span
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <CalendarClock className="h-4 w-4" aria-hidden />
                </motion.span>
                Agendar agora
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
            >
              <a
                href="#servicos"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/12"
              >
                Ver serviços
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2.5 }}
                >
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </motion.span>
              </a>
            </motion.div>
          </motion.div>
        </motion.div>

        <div className="w-full shrink-0 md:max-w-md lg:max-w-[420px]">
          <HeroStudioPanel />
        </div>
      </div>
    </section>
  );
}

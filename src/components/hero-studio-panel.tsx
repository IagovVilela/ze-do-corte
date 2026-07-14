"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowUpRight, CalendarClock, Scissors, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const spring = { stiffness: 320, damping: 32, mass: 0.65 };

const listVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, x: 28, filter: "blur(6px)" },
  show: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

type HeroStudioPanelProps = {
  bookHref?: string;
  servicesHref?: string;
  motionOff?: boolean;
};

export function HeroStudioPanel({
  bookHref = "/agendar",
  servicesHref = "#servicos",
  motionOff = false,
}: HeroStudioPanelProps = {}) {
  const reduceMotionPref = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const reduceMotion = !mounted || motionOff || reduceMotionPref === true;
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const highlights = [
    {
      title: "Agenda no seu ritmo",
      description:
        "Escolha dia e hora no site — rápido, sem fila à espera de resposta.",
      href: bookHref,
      icon: CalendarClock,
    },
    {
      title: "Serviços à medida",
      description:
        "Pacotes claros: corte, barba ou combinação. Veja preços e duração.",
      href: servicesHref,
      icon: Scissors,
    },
    {
      title: "Experiência completa",
      description:
        "Ambiente pensado para conforto, precisão e um resultado que dura.",
      href: bookHref,
      icon: Sparkles,
    },
  ] as const;

  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);

  const rotateX = useSpring(
    useTransform(my, [0, 0.5, 1], reduceMotion ? [0, 0, 0] : [9, 0, -9]),
    spring,
  );
  const rotateY = useSpring(
    useTransform(mx, [0, 0.5, 1], reduceMotion ? [0, 0, 0] : [-11, 0, 11]),
    spring,
  );

  const gradX = useTransform(mx, (v) => `${v * 100}%`);
  const gradY = useTransform(my, (v) => `${v * 100}%`);
  const spotlight = useMotionTemplate`radial-gradient(520px circle at ${gradX} ${gradY}, rgba(250, 204, 21, 0.22), transparent 52%)`;

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reduceMotion) return;
      const el = cardRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      mx.set((e.clientX - r.left) / r.width);
      my.set((e.clientY - r.top) / r.height);
    },
    [mx, my, reduceMotion],
  );

  const handleLeave = useCallback(() => {
    mx.set(0.5);
    my.set(0.5);
  }, [mx, my]);

  return (
    <motion.div
      className="perspective-[1200px]"
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }
      }
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="relative overflow-hidden rounded-2xl border border-white/12 bg-zinc-950/70 shadow-[0_24px_80px_-28px_rgba(0,0,0,0.85)] backdrop-blur-md"
      >
        <motion.div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{ background: spotlight }}
          aria-hidden
        />
        <div className="relative z-10 p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-300" aria-hidden />
            <p className="text-xs font-semibold tracking-[0.22em] text-white uppercase">
              Experiência completa
            </p>
          </div>

          <motion.ul
            className="space-y-2.5"
            variants={listVariants}
            initial={reduceMotion ? false : "hidden"}
            animate="show"
          >
            {highlights.map((item) => (
              <motion.li key={item.title} variants={rowVariants}>
                <Link
                  href={item.href}
                  className="group flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3 transition hover:border-brand-500/35 hover:bg-brand-500/5"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-300">
                    <item.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-zinc-400">
                      {item.description}
                    </span>
                  </span>
                </Link>
              </motion.li>
            ))}
          </motion.ul>

          <motion.div
            className="mt-6 flex items-center justify-between gap-4 border-t border-white/10 pt-5"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { delay: 0.65, duration: 0.45 }
            }
          >
            <p className="max-w-[58%] text-[11px] leading-relaxed text-zinc-500">
              Toque em um cartão para reservar ou ver pacotes — fluxo direto, sem
              ruído.
            </p>
            <Link
              href={bookHref}
              className="group inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-brand-500 px-5 py-2.5 text-xs font-bold text-zinc-950 transition hover:bg-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
            >
              <span className="transition">Reservar</span>
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

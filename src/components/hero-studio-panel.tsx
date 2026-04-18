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
import { useCallback, useRef } from "react";

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

const HIGHLIGHTS = [
  {
    title: "Agenda no seu ritmo",
    description: "Escolha dia e hora no site — rápido, sem fila à espera de resposta.",
    href: "/agendar" as const,
    icon: CalendarClock,
  },
  {
    title: "Serviços à medida",
    description: "Pacotes claros: corte, barba ou combinação. Veja preços e duração.",
    href: "/#servicos" as const,
    icon: Scissors,
  },
  {
    title: "Experiência completa",
    description: "Ambiente pensado para conforto, precisão e um resultado que dura.",
    href: "/agendar" as const,
    icon: Sparkles,
  },
];

export function HeroStudioPanel() {
  const reduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);

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
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      className="relative [perspective:1200px]"
      style={{ transformStyle: "preserve-3d" }}
    >
      {!reduceMotion ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-[1px] z-0 rounded-[1.35rem] opacity-25"
          style={{
            background:
              "conic-gradient(from 0deg, transparent, rgba(250,204,21,0.34), transparent 40%)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        />
      ) : null}

      <motion.div
        ref={cardRef}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="glass-card relative z-10 overflow-hidden rounded-3xl p-1"
      >
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[1.15rem]"
          style={{ background: spotlight }}
        />

        <div
          className="relative rounded-2xl border border-white/10 bg-zinc-950/85 px-5 py-6 backdrop-blur-md"
          style={{ transform: "translateZ(24px)" }}
        >
          <div className="mb-6 flex items-end justify-between gap-3">
            <div>
              <motion.p
                className="font-display text-4xl leading-none tracking-wide text-white md:text-5xl"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
              >
                NO ESTÚDIO
              </motion.p>
              <motion.p
                className="mt-1 text-[11px] font-medium tracking-[0.35em] text-zinc-500 uppercase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45, duration: 0.4 }}
              >
                três formas de viver a experiência
              </motion.p>
            </div>
            <motion.div
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5"
              whileHover={{ scale: 1.08, borderColor: "rgba(234,179,8,0.48)" }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
            >
              <Scissors className="h-5 w-5 text-brand-300" aria-hidden />
            </motion.div>
          </div>

          <motion.ul
            className="space-y-3"
            variants={listVariants}
            initial="hidden"
            animate="show"
          >
            {HIGHLIGHTS.map((item) => (
              <motion.li key={item.title} variants={rowVariants}>
                <Link
                  href={item.href}
                  className="group relative flex w-full items-stretch gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3.5 text-left outline-none transition-colors hover:border-brand-500/35 focus-visible:ring-2 focus-visible:ring-brand-500/50"
                >
                  <motion.span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-brand-300"
                    whileHover={
                      reduceMotion
                        ? undefined
                        : { scale: 1.06, rotate: [0, -4, 4, 0] }
                    }
                    transition={{ type: "tween", duration: 0.4, ease: "easeInOut" }}
                  >
                    <item.icon className="h-5 w-5" aria-hidden />
                  </motion.span>
                  <div className="min-w-0 flex-1 py-0.5">
                    <p className="font-display text-lg tracking-wide text-white">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                      {item.description}
                    </p>
                  </div>
                  <motion.span
                    className="flex shrink-0 items-center self-center text-brand-300/70"
                    whileHover={{ x: 3, y: -2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 22 }}
                  >
                    <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </motion.span>
                </Link>
              </motion.li>
            ))}
          </motion.ul>

          <motion.div
            className="mt-6 flex items-center justify-between gap-4 border-t border-white/10 pt-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.45 }}
          >
            <p className="max-w-[58%] text-[11px] leading-relaxed text-zinc-500">
              Toque em um cartão para reservar ou ver pacotes — fluxo direto, sem ruído.
            </p>
            <Link
              href="/agendar"
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

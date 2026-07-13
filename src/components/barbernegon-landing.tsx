"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  EASE_EDITORIAL,
  fadeUpSmall,
  staggerContainer,
  staggerItem,
  titleWord,
} from "@/lib/motion-presets";

const BRAND = "Barbernegon";
const HEADLINE_WORDS = ["Sua", "barbearia.", "Sua", "cara."] as const;

function MagneticLink({
  href,
  children,
  className,
  primary = false,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  primary?: boolean;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 220, damping: 18 });
  const springY = useSpring(y, { stiffness: 220, damping: 18 });
  const reduce = useReducedMotion();

  const onMove = (e: React.MouseEvent) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * 0.22);
    y.set((e.clientY - r.top - r.height / 2) * 0.22);
  };

  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div style={{ x: springX, y: springY }} className="inline-flex">
      <Link
        ref={ref}
        href={href}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className={
          className ??
          (primary
            ? "inline-flex items-center justify-center rounded-md bg-[#f0ebe3] px-7 py-3.5 text-sm font-semibold tracking-wide text-[#0c0b0a] transition hover:bg-white"
            : "inline-flex items-center justify-center rounded-md border border-white/25 bg-transparent px-7 py-3.5 text-sm font-semibold tracking-wide text-[#f0ebe3] transition hover:border-white/50 hover:bg-white/5")
        }
      >
        {children}
      </Link>
    </motion.div>
  );
}

function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={reduce ? false : { y: -28, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: EASE_EDITORIAL }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div
        className={
          scrolled
            ? "border-b border-white/10 bg-[#0c0b0a]/80 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        }
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="font-[family-name:var(--font-landing-display)] text-xl tracking-[0.14em] text-[#f0ebe3] uppercase"
          >
            {BRAND}
          </Link>
          <nav className="flex items-center gap-5">
            <Link
              href="/admin/login"
              className="hidden text-sm text-white/55 transition hover:text-white sm:inline"
            >
              Entrar
            </Link>
            <MagneticLink href="/cadastro" primary>
              Começar grátis
            </MagneticLink>
          </nav>
        </div>
      </div>
    </motion.header>
  );
}

function HeroBackdrop({ targetRef }: { targetRef: React.RefObject<HTMLElement | null> }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const y = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.35]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || reduce) return;
    void el.play().catch(() => {});
  }, [reduce]);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <motion.div className="absolute inset-0" style={{ scale, y, opacity }}>
        <video
          ref={videoRef}
          src="/images/videoPrincipal.mp4"
          className="h-full w-full object-cover object-[center_28%]"
          muted
          loop
          playsInline
          autoPlay={!reduce}
          preload="auto"
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#0c0b0a]/92 via-[#0c0b0a]/55 to-[#0c0b0a]/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0c0b0a] via-[#0c0b0a]/25 to-[#0c0b0a]/45" />
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const spotX = useTransform(mouseX, (v) => `${v * 100}%`);
  const spotY = useTransform(mouseY, (v) => `${v * 100}%`);
  const spotlight = useMotionTemplate`radial-gradient(520px circle at ${spotX} ${spotY}, rgba(240,235,227,0.12), transparent 55%)`;

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!ref.current || reduce) return;
      const r = ref.current.getBoundingClientRect();
      mouseX.set((e.clientX - r.left) / r.width);
      mouseY.set((e.clientY - r.top) / r.height);
    },
    [mouseX, mouseY, reduce],
  );

  return (
    <section
      ref={ref}
      onMouseMove={onMove}
      className="relative isolate min-h-[100svh] overflow-hidden pt-16"
    >
      <HeroBackdrop targetRef={ref} />
      {!reduce ? (
        <motion.div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{ background: spotlight }}
        />
      ) : null}

      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-4rem)] max-w-6xl flex-col justify-end px-4 pb-16 sm:px-6 md:pb-24">
        <motion.div
          variants={staggerContainer(0.09, 0.12)}
          initial="hidden"
          animate="visible"
          className="max-w-3xl"
        >
          <motion.p
            variants={fadeUpSmall}
            className="font-[family-name:var(--font-landing-display)] text-[clamp(3.4rem,12vw,8.5rem)] leading-[0.86] tracking-[0.04em] text-[#f0ebe3] uppercase"
          >
            {BRAND}
          </motion.p>

          <motion.h1
            className="mt-5 max-w-xl text-2xl font-medium leading-tight tracking-tight text-[#f0ebe3]/90 sm:text-3xl md:text-4xl"
            variants={staggerContainer(0.05, 0)}
          >
            {HEADLINE_WORDS.map((word, i) => (
              <span key={`${word}-${i}`} className="inline-block overflow-hidden align-bottom">
                <motion.span className="inline-block pr-[0.28em]" variants={titleWord}>
                  {word}
                </motion.span>
              </span>
            ))}
          </motion.h1>

          <motion.p
            variants={fadeUpSmall}
            className="mt-5 max-w-md text-base leading-relaxed text-white/65 md:text-lg"
          >
            Site próprio, agenda em segundos e painel limpo — sem burocracia.
          </motion.p>

          <motion.div variants={fadeUpSmall} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <MagneticLink href="/cadastro" primary>
              Criar minha barbearia
            </MagneticLink>
            <MagneticLink href="/ze-do-corte">Ver demo ao vivo</MagneticLink>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        aria-hidden
        className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 md:block"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
      >
        <motion.div
          className="h-10 w-px origin-top bg-gradient-to-b from-white/50 to-transparent"
          animate={reduce ? undefined : { scaleY: [0.4, 1, 0.4], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </section>
  );
}

function Reveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 56, filter: "blur(12px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.25, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.85, ease: EASE_EDITORIAL }}
    >
      {children}
    </motion.div>
  );
}

function FeatureStrip({
  index,
  title,
  body,
  href,
  cta,
}: {
  index: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <Reveal>
      <div className="group grid gap-8 border-t border-white/10 py-16 md:grid-cols-[140px_1fr_auto] md:items-end md:gap-12 md:py-20">
        <p className="font-[family-name:var(--font-landing-display)] text-5xl tracking-wide text-white/20 transition group-hover:text-[#c45c3a]/80">
          {index}
        </p>
        <div>
          <h2 className="font-[family-name:var(--font-landing-display)] text-4xl tracking-wide text-[#f0ebe3] md:text-5xl">
            {title}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/55">{body}</p>
        </div>
        <MagneticLink href={href}>{cta}</MagneticLink>
      </div>
    </Reveal>
  );
}

function Marquee() {
  const reduce = useReducedMotion();
  const items = [
    "Site white-label",
    "Agendamento online",
    "Admin limpo",
    "Caixa no balcão",
    "Clube sem burocracia",
    "Cancelamento claro",
  ];
  const row = [...items, ...items];

  return (
    <div className="overflow-hidden border-y border-white/10 bg-[#12100e] py-4">
      <motion.div
        className="flex w-max gap-10 whitespace-nowrap"
        animate={reduce ? undefined : { x: ["0%", "-50%"] }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      >
        {row.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className="font-[family-name:var(--font-landing-display)] text-2xl tracking-[0.18em] text-white/35 uppercase"
          >
            {label}
            <span className="ml-10 text-[#c45c3a]/70">/</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

function ClosingCta() {
  return (
    <section className="relative overflow-hidden py-28 md:py-36">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(196,92,58,0.18), transparent 55%), linear-gradient(180deg, #0c0b0a, #141210)",
        }}
      />
      <Reveal className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <p className="font-[family-name:var(--font-landing-display)] text-5xl leading-[0.9] tracking-wide text-[#f0ebe3] md:text-7xl">
          Pronto em minutos.
          <br />
          Não em semanas.
        </p>
        <p className="mx-auto mt-6 max-w-lg text-base text-white/55">
          Sem App Store. Sem marketplace que dilui sua marca. Trial completo para validar com a
          sua clientela.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <MagneticLink href="/cadastro" primary>
            Começar agora
          </MagneticLink>
          <MagneticLink href="/planos">Ver planos</MagneticLink>
        </div>
      </Reveal>
    </section>
  );
}

export function BarbernegonLanding() {
  return (
    <div className="min-h-svh bg-[#0c0b0a] text-[#f0ebe3] selection:bg-[#c45c3a]/40">
      <LandingNav />
      <main>
        <Hero />
        <Marquee />
        <section className="mx-auto max-w-6xl px-4 sm:px-6">
          <FeatureStrip
            index="01"
            title="Site com a sua cara"
            body="Logo, cores, slogans e hero — em barbernegon.com/sua-marca. Identidade real, não um logo em app genérico."
            href="/ze-do-corte"
            cta="Ver demo"
          />
          <FeatureStrip
            index="02"
            title="Agenda em segundos"
            body="Cliente marca no navegador, escolhe serviço e horário — sem baixar app e sem ver concorrentes."
            href="/ze-do-corte/agendar"
            cta="Agendar demo"
          />
          <FeatureStrip
            index="03"
            title="Caixa e clube simples"
            body="Relatórios no balcão e assinaturas com cancelamento imediato. Sem prender o cliente."
            href="/cadastro"
            cta="Criar conta"
          />
        </section>
        <ClosingCta />
      </main>
      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-white/40 sm:flex-row sm:px-6">
          <p>
            © {new Date().getFullYear()} {BRAND}
          </p>
          <div className="flex gap-5">
            <Link href="/planos" className="transition hover:text-white/80">
              Planos
            </Link>
            <Link href="/admin/login" className="transition hover:text-white/80">
              Painel
            </Link>
            <Link href="/cadastro" className="transition hover:text-white/80">
              Cadastro
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

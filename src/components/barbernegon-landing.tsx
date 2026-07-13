"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { EASE_EDITORIAL } from "@/lib/motion-presets";

/**
 * Landing Barbernegon — estética cinema (grain, vídeo full-bleed, tipografia forte).
 * Microinterações com Framer Motion; conteúdo legível mesmo com reduced-motion.
 */

function useMagnetic() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 20 });
  const sy = useSpring(y, { stiffness: 260, damping: 20 });
  const reduce = useReducedMotion();
  const onMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (reduce) return;
      const r = e.currentTarget.getBoundingClientRect();
      x.set((e.clientX - r.left - r.width / 2) * 0.28);
      y.set((e.clientY - r.top - r.height / 2) * 0.28);
    },
    [reduce, x, y],
  );
  const onLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);
  return { sx, sy, onMove, onLeave };
}

function Cta({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
}) {
  const { sx, sy, onMove, onLeave } = useMagnetic();
  const base =
    variant === "primary"
      ? "bg-[#e8e2d6] text-[#0a0908] hover:bg-white"
      : "border border-white/30 text-[#e8e2d6] hover:border-white/60 hover:bg-white/5";
  return (
    <motion.div style={{ x: sx, y: sy }} className="inline-flex">
      <Link
        href={href}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className={`inline-flex min-h-12 items-center justify-center px-8 text-[13px] font-semibold tracking-[0.14em] uppercase transition ${base}`}
      >
        {children}
      </Link>
    </motion.div>
  );
}

function Nav() {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const fn = () => setSolid(window.scrollY > 40);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        solid ? "border-b border-white/10 bg-black/70 backdrop-blur-md" : ""
      }`}
    >
      <div className="mx-auto flex h-[4.25rem] max-w-[1200px] items-center justify-between px-5 md:px-8">
        <Link
          href="/"
          className="font-display text-[1.35rem] tracking-[0.22em] text-[#e8e2d6] uppercase"
        >
          Barbernegon
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/admin/login"
            className="hidden text-[12px] tracking-[0.16em] text-white/50 uppercase transition hover:text-white sm:inline"
          >
            Entrar
          </Link>
          <Cta href="/cadastro">Começar</Cta>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const mediaScale = useTransform(scrollYProgress, [0, 1], [1, 1.14]);
  const mediaY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || reduce) return;
    void v.play().catch(() => undefined);
  }, [reduce]);

  return (
    <section ref={sectionRef} className="relative h-[100svh] min-h-[640px] overflow-hidden bg-black">
      <motion.div
        className="absolute inset-0"
        style={reduce ? undefined : { scale: mediaScale, y: mediaY }}
      >
        <video
          ref={videoRef}
          className="h-full w-full object-cover object-[center_30%] contrast-[1.05] saturate-[0.85]"
          src="/images/videoPrincipal.mp4"
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          aria-hidden
        />
        {/* film grain */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/55 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/50" />
      </motion.div>

      <motion.div
        className="relative z-10 mx-auto flex h-full max-w-[1200px] flex-col justify-end px-5 pb-16 md:px-8 md:pb-24"
        style={reduce ? undefined : { y: contentY, opacity: contentOpacity }}
      >
        <motion.p
          className="font-display text-[clamp(3.75rem,14vw,9.5rem)] leading-[0.82] tracking-[0.06em] text-[#e8e2d6] uppercase"
          initial={reduce ? false : { opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE_EDITORIAL }}
        >
          Barbernegon
        </motion.p>

        <motion.h1
          className="mt-5 max-w-xl text-[clamp(1.35rem,3.2vw,2.15rem)] font-medium leading-[1.15] tracking-tight text-[#e8e2d6]/90"
          initial={reduce ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: EASE_EDITORIAL }}
        >
          Sua barbearia. Sua cara.
        </motion.h1>

        <motion.p
          className="mt-4 max-w-md text-[15px] leading-relaxed text-white/60 md:text-base"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.28, ease: EASE_EDITORIAL }}
        >
          Site próprio, agenda em segundos e painel limpo — sem burocracia.
        </motion.p>

        <motion.div
          className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: EASE_EDITORIAL }}
        >
          <Cta href="/cadastro">Criar minha barbearia</Cta>
          <Cta href="/ze-do-corte" variant="ghost">
            Ver demo ao vivo
          </Cta>
        </motion.div>
      </motion.div>

      {!reduce ? (
        <motion.div
          aria-hidden
          className="absolute bottom-7 left-1/2 z-10 h-12 w-px -translate-x-1/2 bg-gradient-to-b from-white/55 to-transparent"
          animate={{ scaleY: [0.45, 1, 0.45], opacity: [0.35, 0.85, 0.35] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}
    </section>
  );
}

function SectionReveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      className={className}
      initial={reduce ? false : { opacity: 0, y: 64 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.85, ease: EASE_EDITORIAL }}
    >
      {children}
    </motion.section>
  );
}

function Statement() {
  return (
    <SectionReveal className="relative overflow-hidden bg-[#070707] px-5 py-28 md:px-8 md:py-36">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 20% 0%, rgba(232,226,214,0.25), transparent 55%)",
        }}
      />
      <div className="relative mx-auto max-w-[1200px]">
        <p className="text-[11px] tracking-[0.28em] text-white/40 uppercase">
          Posicionamento
        </p>
        <h2 className="font-display mt-5 max-w-4xl text-[clamp(2.4rem,6vw,5rem)] leading-[0.95] tracking-[0.04em] text-[#e8e2d6] uppercase">
          Identidade real.
          <br />
          Zero marketplace.
          <br />
          Setup em minutos.
        </h2>
        <p className="mt-8 max-w-lg text-base leading-relaxed text-white/50">
          Sua marca na frente — não um app genérico. O cliente agenda no navegador,
          sem baixar nada e sem ver concorrentes.
        </p>
      </div>
    </SectionReveal>
  );
}

function ProductMoments() {
  const items = [
    {
      n: "01",
      title: "Site com a sua cara",
      body: "Logo, cores, slogans e hero em /sua-marca. White-label de verdade.",
      href: "/ze-do-corte",
      label: "Abrir demo",
    },
    {
      n: "02",
      title: "Agenda em segundos",
      body: "Serviço, horário, confirmação. Fluido no mobile — sem App Store.",
      href: "/ze-do-corte/agendar",
      label: "Agendar",
    },
    {
      n: "03",
      title: "Caixa e clube claros",
      body: "Relatório no balcão e assinaturas com cancelamento imediato.",
      href: "/cadastro",
      label: "Começar",
    },
  ];

  return (
    <section className="border-t border-white/10 bg-black">
      <div className="mx-auto max-w-[1200px] px-5 md:px-8">
        {items.map((item, i) => (
          <SectionReveal key={item.n}>
            <div
              className={`grid gap-8 py-16 md:grid-cols-[100px_1.2fr_0.8fr] md:items-end md:gap-12 md:py-24 ${
                i < items.length - 1 ? "border-b border-white/10" : ""
              }`}
            >
              <p className="font-display text-4xl tracking-wide text-white/20">{item.n}</p>
              <div>
                <h3 className="font-display text-4xl tracking-[0.04em] text-[#e8e2d6] uppercase md:text-5xl">
                  {item.title}
                </h3>
                <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/50">
                  {item.body}
                </p>
              </div>
              <div className="md:justify-self-end">
                <Cta href={item.href} variant="ghost">
                  {item.label}
                </Cta>
              </div>
            </div>
          </SectionReveal>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <SectionReveal className="relative overflow-hidden border-t border-white/10 bg-[#0a0908] px-5 py-28 text-center md:px-8 md:py-36">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 45% at 50% 0%, rgba(232,226,214,0.08), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-3xl">
        <h2 className="font-display text-[clamp(2.6rem,7vw,5.5rem)] leading-[0.9] tracking-[0.05em] text-[#e8e2d6] uppercase">
          Pronto em minutos.
          <br />
          Não em semanas.
        </h2>
        <p className="mx-auto mt-6 max-w-md text-white/50">
          Trial completo. Sem App Store. Sem diluir sua marca em marketplace.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Cta href="/cadastro">Começar agora</Cta>
          <Cta href="/planos" variant="ghost">
            Ver planos
          </Cta>
        </div>
      </div>
    </SectionReveal>
  );
}

export function BarbernegonLanding() {
  return (
    <div className="min-h-svh bg-black text-[#e8e2d6] antialiased selection:bg-white/20">
      <Nav />
      <main>
        <Hero />
        <Statement />
        <ProductMoments />
        <FinalCta />
      </main>
      <footer className="border-t border-white/10 bg-black py-8">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 px-5 text-[11px] tracking-[0.14em] text-white/35 uppercase md:flex-row md:px-8">
          <p>© {new Date().getFullYear()} Barbernegon</p>
          <div className="flex gap-6">
            <Link href="/planos" className="hover:text-white/70">
              Planos
            </Link>
            <Link href="/admin/login" className="hover:text-white/70">
              Painel
            </Link>
            <Link href="/ze-do-corte" className="hover:text-white/70">
              Demo
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

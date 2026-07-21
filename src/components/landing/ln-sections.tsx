"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import Link from "next/link";
import { useRef } from "react";

import { lnFadeUp, lnStagger, LN_EASE } from "@/components/landing/ln-motion";
import {
  CountUp,
  InfiniteMarquee,
  MagneticCta,
  RevealWords,
  ScrambleText,
  TiltCard,
} from "@/components/landing/ln-primitives";

export function LandingNav() {
  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: LN_EASE, delay: 0.2 }}
      className="fixed inset-x-0 top-4 z-50 flex justify-center px-4"
    >
      <nav className="flex w-full max-w-5xl items-center justify-between rounded-full border border-white/10 bg-[#0b1220]/65 px-3 py-2 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-xl md:px-5">
        <Link
          href="/"
          className="pl-2 font-[family-name:var(--font-ln-display)] text-lg font-semibold tracking-tight text-white"
        >
          Barbernegon
        </Link>
        <div className="flex items-center gap-2 md:gap-3">
          <Link
            href="/admin/login"
            className="hidden rounded-full px-3 py-2 text-xs font-medium text-white/55 transition hover:text-white sm:inline"
          >
            Entrar
          </Link>
          <MagneticCta href="/cadastro">Começar trial</MagneticCta>
        </div>
      </nav>
    </motion.header>
  );
}

export function HeroSignal() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const orbY = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const panelY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const fade = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative isolate min-h-[100svh] overflow-hidden px-4 pb-16 pt-28 md:px-8 md:pt-32"
    >
      {/* aurora orbs — sem vídeo / sem cinema grain */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-10 h-[42rem] w-[42rem] rounded-full bg-[#2af5c0]/20 blur-[110px]"
        style={reduce ? undefined : { y: orbY }}
        animate={
          reduce
            ? undefined
            : { scale: [1, 1.08, 1], opacity: [0.35, 0.55, 0.35] }
        }
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-40 h-[34rem] w-[34rem] rounded-full bg-[#6f8cff]/25 blur-[100px]"
        animate={
          reduce ? undefined : { x: [0, -30, 0], y: [0, 40, 0] }
        }
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent)",
        }}
      />

      <motion.div
        style={reduce ? undefined : { opacity: fade }}
        className="relative z-10 mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"
      >
        <motion.div
          variants={lnStagger}
          initial="hidden"
          animate="show"
          className="max-w-xl"
        >
          <motion.p
            variants={lnFadeUp}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#2af5c0]/25 bg-[#2af5c0]/10 px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-[#2af5c0] uppercase"
          >
            <span className="size-1.5 animate-pulse rounded-full bg-[#2af5c0]" />
            SaaS para barbearias
          </motion.p>
          <motion.h1
            variants={lnFadeUp}
            className="font-[family-name:var(--font-ln-display)] text-[clamp(2.8rem,9vw,5.6rem)] leading-[0.92] font-semibold tracking-[-0.04em] text-white"
          >
            Sua barbearia.
            <br />
            <span className="bg-[linear-gradient(120deg,#2af5c0_20%,#9bb6ff_80%)] bg-clip-text text-transparent">
              Sua cara.
            </span>
          </motion.h1>
          <motion.p
            variants={lnFadeUp}
            className="mt-6 max-w-md text-[15px] leading-relaxed text-white/55 md:text-base"
          >
            Site próprio, agenda em segundos e painel limpo — sem burocracia e
            sem diluir sua marca em marketplace.
          </motion.p>
          <motion.div
            variants={lnFadeUp}
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <MagneticCta href="/cadastro">Criar minha barbearia</MagneticCta>
            <MagneticCta href="/ze-do-corte" tone="ghost">
              Ver demo Barbergon
            </MagneticCta>
          </motion.div>
          <motion.p
            variants={lnFadeUp}
            className="mt-6 text-xs text-white/35"
          >
            Trial completo · setup em minutos ·{" "}
            <ScrambleText text="SEM APP STORE" className="text-white/55" />
          </motion.p>
        </motion.div>

        <motion.div
          style={reduce ? undefined : { y: panelY }}
          initial={{ opacity: 0, x: 40, rotate: 2 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          transition={{ duration: 1, ease: LN_EASE, delay: 0.25 }}
          className="relative"
        >
          <TiltCard className="relative overflow-hidden rounded-[28px] border border-white/12 bg-gradient-to-br from-white/[0.09] to-white/[0.02] p-5 shadow-[0_40px_100px_-40px_rgba(42,245,192,0.35)] backdrop-blur-xl md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] tracking-[0.22em] text-white/40 uppercase">
                  Preview
                </p>
                <p className="font-[family-name:var(--font-ln-display)] text-xl text-white">
                  /sua-marca
                </p>
              </div>
              <span className="rounded-full bg-[#2af5c0]/15 px-3 py-1 text-[11px] text-[#2af5c0]">
                Live
              </span>
            </div>
            <div className="grid gap-3">
              {[
                { label: "Agenda", value: "14 slots hoje", w: "72%" },
                { label: "Caixa", value: "R$ 1.280", w: "54%" },
                { label: "Clube", value: "23 ativos", w: "63%" },
              ].map((row, i) => (
                <motion.div
                  key={row.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 + i * 0.12, ease: LN_EASE }}
                  className="rounded-2xl border border-white/8 bg-black/30 p-4"
                >
                  <div className="mb-2 flex justify-between text-xs text-white/50">
                    <span>{row.label}</span>
                    <span className="text-white/80">{row.value}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#2af5c0,#7aa2ff)]"
                      initial={{ width: 0 }}
                      animate={{ width: row.w }}
                      transition={{
                        delay: 0.7 + i * 0.12,
                        duration: 0.9,
                        ease: LN_EASE,
                      }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -right-8 -bottom-10 size-40 rounded-full border border-[#2af5c0]/30"
              animate={{ rotate: 360 }}
              transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
            />
          </TiltCard>
          <p className="pointer-events-none absolute -left-2 top-1/2 hidden -translate-y-1/2 -rotate-90 font-[family-name:var(--font-ln-display)] text-xs tracking-[0.4em] text-white/20 uppercase lg:block">
            Barbernegon
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}

export function ValueMarquee() {
  return (
    <InfiniteMarquee
      items={[
        "Site white-label",
        "Agenda online",
        "Painel da equipe",
        "Caixa no balcão",
        "Clube de assinaturas",
        "Cancelamento claro",
        "Multi-unidade",
        "WhatsApp bot",
      ]}
    />
  );
}

export function ManifestoSplit() {
  return (
    <section className="relative px-4 py-24 md:px-8 md:py-32">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: LN_EASE }}
        >
          <p className="text-[11px] tracking-[0.28em] text-[#2af5c0]/80 uppercase">
            Posicionamento
          </p>
          <h2 className="mt-4 font-[family-name:var(--font-ln-display)] text-[clamp(2rem,5vw,3.4rem)] leading-[1.05] font-semibold tracking-tight text-white">
            <RevealWords text="Identidade real. Zero marketplace." />
          </h2>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.85, ease: LN_EASE }}
          className="relative rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 md:p-10"
        >
          <div
            aria-hidden
            className="absolute -top-px left-8 h-px w-24 bg-gradient-to-r from-[#2af5c0] to-transparent"
          />
          <p className="text-lg leading-relaxed text-white/60 md:text-xl">
            Sua marca na frente — não um app genérico. O cliente agenda no
            navegador, sem baixar nada e sem ver concorrentes.
          </p>
          <p className="mt-6 text-sm text-white/40">
            Setup em minutos. Operação no dia a dia. Sem burocracia.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

export function StickyProductStory() {
  const panels = [
    {
      kicker: "01 · Presença",
      title: "Site com a sua cara",
      body: "Logo, cores, slogans e hero em /sua-marca. White-label de verdade.",
      href: "/ze-do-corte",
      cta: "Abrir demo Barbergon",
      accent: "from-[#2af5c0]/20 to-transparent",
    },
    {
      kicker: "02 · Fluxo",
      title: "Agenda em segundos",
      body: "Serviço, horário, confirmação. Fluido no mobile — sem App Store.",
      href: "/ze-do-corte/agendar",
      cta: "Agendar",
      accent: "from-[#7aa2ff]/25 to-transparent",
    },
    {
      kicker: "03 · Receita",
      title: "Caixa e clube claros",
      body: "Relatório no balcão e assinaturas com cancelamento imediato.",
      href: "/cadastro",
      cta: "Começar",
      accent: "from-[#ffb86b]/20 to-transparent",
    },
  ];

  return (
    <section className="relative bg-[#05070d]">
      {panels.map((p, i) => (
        <div
          key={p.kicker}
          className="sticky top-0 flex min-h-[100svh] items-center border-t border-white/5 px-4 py-24 md:px-8"
          style={{ zIndex: i + 1 }}
        >
          <div
            className={`absolute inset-0 bg-gradient-to-br ${p.accent} opacity-80`}
            aria-hidden
          />
          <div className="absolute inset-0 bg-[#070a12]/80 backdrop-blur-[2px]" />
          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: false, amount: 0.45 }}
            transition={{ duration: 0.7, ease: LN_EASE }}
            className="relative z-10 mx-auto grid w-full max-w-6xl gap-8 md:grid-cols-[1fr_auto] md:items-end"
          >
            <div>
              <p className="text-[11px] tracking-[0.24em] text-white/40 uppercase">
                {p.kicker}
              </p>
              <h3 className="mt-3 font-[family-name:var(--font-ln-display)] text-[clamp(2.4rem,7vw,4.5rem)] leading-[0.95] font-semibold tracking-tight text-white">
                {p.title}
              </h3>
              <p className="mt-5 max-w-lg text-base text-white/55">{p.body}</p>
            </div>
            <MagneticCta href={p.href} tone="ghost">
              {p.cta}
            </MagneticCta>
          </motion.div>
        </div>
      ))}
    </section>
  );
}

export function BentoProof() {
  return (
    <section className="px-4 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: LN_EASE }}
          className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <h2 className="max-w-md font-[family-name:var(--font-ln-display)] text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Feito para operar — e converter.
          </h2>
          <p className="max-w-sm text-sm text-white/45">
            Cada bloco da plataforma existe para reduzir atrito: do visitante ao
            horário marcado, do corte ao clube.
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-12">
          <TiltCard className="md:col-span-7">
            <div className="h-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-[radial-gradient(ellipse_at_top_left,_rgba(42,245,192,0.18),_transparent_55%),rgba(255,255,255,0.03)] p-7 md:p-9">
              <p className="text-[11px] tracking-[0.2em] text-[#2af5c0] uppercase">
                Credibilidade
              </p>
              <p className="mt-4 font-[family-name:var(--font-ln-display)] text-3xl text-white md:text-4xl">
                Parece produto premium porque opera como um.
              </p>
              <div className="mt-10 grid grid-cols-3 gap-4">
                {[
                  { n: 14, s: "dias", l: "de trial" },
                  { n: 1, s: "min", l: "para o 1º site" },
                  { n: 0, s: "", l: "marketplace" },
                ].map((s) => (
                  <div key={s.l} className="rounded-2xl bg-black/25 p-3">
                    <p className="font-[family-name:var(--font-ln-display)] text-2xl text-white md:text-3xl">
                      <CountUp to={s.n} suffix={s.s ? ` ${s.s}` : ""} />
                    </p>
                    <p className="mt-1 text-[11px] text-white/45">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </TiltCard>

          <TiltCard className="md:col-span-5">
            <div className="flex h-full flex-col justify-between overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-7">
              <div>
                <p className="text-[11px] tracking-[0.2em] text-white/40 uppercase">
                  Diferencial
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
                  Sem App Store. Sem fila de aprovação.
                </p>
              </div>
              <Link
                href="/planos"
                data-cursor="grow"
                className="group mt-10 inline-flex items-center gap-2 text-sm text-[#2af5c0]"
              >
                Ver planos
                <motion.span
                  aria-hidden
                  className="inline-block"
                  whileHover={{ x: 4 }}
                >
                  →
                </motion.span>
              </Link>
            </div>
          </TiltCard>

          <TiltCard className="md:col-span-4">
            <div className="rounded-[1.75rem] border border-white/10 bg-[#0d1424] p-6">
              <p className="text-sm text-white/50">Multi-unidade</p>
              <p className="mt-2 text-xl text-white">Filiais no mesmo painel</p>
            </div>
          </TiltCard>
          <TiltCard className="md:col-span-4">
            <div className="rounded-[1.75rem] border border-white/10 bg-[#0d1424] p-6">
              <p className="text-sm text-white/50">WhatsApp</p>
              <p className="mt-2 text-xl text-white">Bot que agenda de verdade</p>
            </div>
          </TiltCard>
          <TiltCard className="md:col-span-4">
            <div className="rounded-[1.75rem] border border-white/10 bg-[#0d1424] p-6">
              <p className="text-sm text-white/50">Pagamentos</p>
              <p className="mt-2 text-xl text-white">PIX e planos via Asaas</p>
            </div>
          </TiltCard>
        </div>
      </div>
    </section>
  );
}

export function FinalSignalCta() {
  return (
    <section className="relative overflow-hidden px-4 py-28 md:px-8 md:py-36">
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 size-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2af5c0]/15 blur-[100px]"
        animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: LN_EASE }}
          className="font-[family-name:var(--font-ln-display)] text-[clamp(2.4rem,7vw,4.8rem)] leading-[0.95] font-semibold tracking-tight text-white"
        >
          Pronto em minutos.
          <br />
          Não em semanas.
        </motion.h2>
        <p className="mx-auto mt-6 max-w-md text-white/50">
          Trial completo. Sem App Store. Sem diluir sua marca em marketplace.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <MagneticCta href="/cadastro">Começar agora</MagneticCta>
          <MagneticCta href="/planos" tone="ghost">
            Ver planos
          </MagneticCta>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-white/10 px-4 py-10 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 text-xs text-white/35 md:flex-row">
        <p className="font-[family-name:var(--font-ln-display)] text-sm text-white/55">
          © {new Date().getFullYear()} Barbernegon
        </p>
        <div className="flex gap-6">
          <Link href="/planos" className="transition hover:text-white">
            Planos
          </Link>
          <Link href="/admin/login" className="transition hover:text-white">
            Painel
          </Link>
          <Link href="/ze-do-corte" className="transition hover:text-white">
            Demo Barbergon
          </Link>
        </div>
      </div>
    </footer>
  );
}

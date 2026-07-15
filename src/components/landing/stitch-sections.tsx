"use client";

import { motion } from "framer-motion";
import {
  Check,
  EyeOff,
  Globe2,
  LayoutTemplate,
  Palette,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { HeroOrb } from "@/components/landing/hero-orb";
import { publicSurfaceUrl } from "@/lib/public-hosts";

const ease = [0.16, 1, 0.3, 1] as const;
const explorarHref = publicSurfaceUrl("marketplace", "/explorar");

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, ease, delay }}
    >
      {children}
    </motion.div>
  );
}

function GlassCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-white/10 bg-white/[0.02] backdrop-blur-[20px] transition-transform duration-500 hover:-translate-y-2 ${className}`}
    >
      {children}
    </div>
  );
}

function MonoLabel({ children }: { children: ReactNode }) {
  return (
    <span className="font-[family-name:var(--font-ln-mono)] text-[12px] font-medium tracking-[0.1em] uppercase">
      {children}
    </span>
  );
}

export function StitchNav() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-[#FFFFFF05] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] backdrop-blur-[20px]">
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 md:px-16">
        <Link
          href="/"
          className="text-xl font-semibold tracking-tighter text-[var(--ln-on)] md:text-[32px] md:leading-none"
        >
          Barbernegon
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          {(
            [
              ["#identidade", "Produto"],
              ["#site", "Soluções"],
              [explorarHref, "Barbearias"],
              ["/planos", "Planos"],
            ] as const
          ).map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="text-[var(--ln-muted)] transition-colors duration-300 hover:text-[var(--ln-primary)]"
            >
              <MonoLabel>{label}</MonoLabel>
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/admin/login"
            className="hidden text-[var(--ln-muted)] transition-colors hover:text-[var(--ln-primary)] md:block"
          >
            <MonoLabel>Entrar</MonoLabel>
          </Link>
          <Link
            href="/cadastro"
            className="rounded-full bg-[var(--ln-primary)] px-5 py-3 text-[var(--ln-on-primary)] shadow-[0_0_15px_rgba(59,130,246,0.35)] transition-all duration-300 hover:scale-95 hover:bg-[var(--ln-primary-container)] hover:text-white md:px-6"
          >
            <MonoLabel>Começar</MonoLabel>
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function StitchHero() {
  return (
    <section className="relative mx-auto flex min-h-[min(921px,100svh)] max-w-[1440px] items-center px-5 pt-20 md:px-16">
      <HeroOrb />
      <div className="relative z-10 grid w-full grid-cols-1 gap-6 lg:grid-cols-12">
        <Reveal className="flex flex-col items-start justify-center space-y-8 lg:col-span-8">
          <h1 className="bg-gradient-to-r from-white to-[var(--ln-primary-container)] bg-clip-text text-[48px] leading-[1.1] font-extrabold tracking-[-0.04em] text-transparent drop-shadow-2xl md:text-[80px]">
            Sua barbearia.
            <br />
            <span className="ml-12 inline-block md:ml-24">Sua cara.</span>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-[var(--ln-muted)]">
            Esqueça agendas no WhatsApp. Tenha um sistema próprio de
            agendamentos que reflete a identidade da sua marca. Construído para
            profissionais exigentes que não abrem mão da excelência em cada
            detalhe.
          </p>
          <Link
            href="/cadastro"
            className="group relative mt-4 overflow-hidden rounded-full border border-[#8eb6ff]/30 bg-[var(--ln-surface-high)] px-8 py-4 transition-all hover:scale-95"
          >
            <span className="relative z-10 text-[var(--ln-primary)] transition-colors group-hover:text-white">
              <MonoLabel>Começar agora</MonoLabel>
            </span>
            <div className="absolute inset-0 bg-[var(--ln-primary)] opacity-0 transition-opacity duration-300 group-hover:opacity-20" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

export function StitchIdentity() {
  const cards = [
    {
      icon: Palette,
      title: "Customização Total",
      body: "Ajuste cores, tipografia e imagens. O Barbernegon se molda completamente ao manual de marca da sua barbearia.",
    },
    {
      icon: Globe2,
      title: "Domínio Próprio",
      body: "Conecte seu próprio endereço web. Seus clientes acessam “suabarbearia.com.br”, elevando o nível de profissionalismo.",
    },
    {
      icon: EyeOff,
      title: "Sem Concorrência",
      body: "Ao contrário de aplicativos agregadores, aqui seu cliente não vê anúncios de outras barbearias próximas.",
    },
  ];

  return (
    <section
      id="identidade"
      className="mx-auto max-w-[1440px] px-5 py-24 md:px-16 md:py-32"
    >
      <Reveal className="mb-16">
        <h2 className="text-2xl font-bold tracking-tighter text-[var(--ln-on)] md:text-[56px] md:leading-[1.1]">
          Identidade Real
        </h2>
        <p className="mt-4 max-w-xl text-lg text-[var(--ln-muted)]">
          Seu espaço digital deve ser tão autêntico quanto o corte que você
          entrega. Sem logos de terceiros, apenas a sua essência.
        </p>
      </Reveal>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => (
          <Reveal key={c.title} delay={i * 0.08}>
            <GlassCard className="h-full p-8">
              <div className="mb-6 flex size-12 items-center justify-center rounded-full border border-[#8eb6ff]/25 bg-[var(--ln-surface-high)] shadow-[0_0_24px_-8px_rgba(59,130,246,0.5)]">
                <c.icon className="size-5 text-[var(--ln-primary)]" />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-[var(--ln-on)] md:text-2xl">
                {c.title}
              </h3>
              <p className="text-base leading-relaxed text-[var(--ln-muted)]">
                {c.body}
              </p>
            </GlassCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function StitchSiteSection() {
  return (
    <section
      id="site"
      className="relative overflow-hidden border-y border-white/5 bg-[var(--ln-surface-lowest)]/50 px-5 py-24 md:px-16 md:py-32"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-0 h-[600px] w-[600px] -translate-y-1/2 rounded-full bg-[var(--ln-primary-container)]/10 blur-[120px]"
      />
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-16 lg:grid-cols-2">
        <Reveal className="relative order-2 h-[420px] lg:order-1 lg:h-[500px]">
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              whileHover={{ rotate: 0 }}
              className="absolute z-10 h-[400px] w-[300px] -rotate-[5deg] overflow-hidden rounded-lg border border-[#8eb6ff]/30 bg-white/[0.02] shadow-2xl backdrop-blur-xl transition-transform duration-700"
            >
              <div className="flex h-full flex-col bg-[#0a0e13]/90 p-5">
                <p className="font-[family-name:var(--font-ln-mono)] text-[11px] tracking-[0.14em] text-[var(--ln-primary)] uppercase">
                  /sua-marca
                </p>
                <p className="mt-4 text-2xl font-bold text-white">Agenda</p>
                <div className="mt-6 space-y-2">
                  {["09:00", "10:30", "14:00", "16:30"].map((t) => (
                    <div
                      key={t}
                      className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-3 py-2"
                    >
                      <span className="font-[family-name:var(--font-ln-mono)] text-sm text-[var(--ln-primary)]">
                        {t}
                      </span>
                      <span className="text-xs text-[var(--ln-muted)]">
                        Disponível
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
            <div className="absolute z-0 h-[380px] w-[280px] translate-x-12 translate-y-8 rotate-[8deg] overflow-hidden rounded-lg border border-white/10 opacity-60">
              <div
                className="h-full w-full bg-cover bg-center"
                style={{
                  backgroundImage:
                    "linear-gradient(160deg, rgba(59,130,246,0.25), transparent 50%), linear-gradient(#121820,#0a0e13)",
                }}
              />
              <div className="absolute inset-0 flex flex-col justify-end p-5">
                <LayoutTemplate className="mb-3 size-6 text-[var(--ln-primary)]" />
                <p className="text-sm text-white/80">Painel do salão</p>
                <p className="text-xs text-white/40">Caixa · Clube · Equipe</p>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal className="order-1 space-y-6 lg:order-2">
          <div className="mb-2 text-[var(--ln-primary)]">
            <MonoLabel>Presença Digital</MonoLabel>
          </div>
          <h2 className="text-2xl font-bold tracking-tighter text-[var(--ln-on)] md:text-[56px] md:leading-[1.1]">
            Site com a
            <br />
            sua cara
          </h2>
          <p className="text-lg leading-relaxed text-[var(--ln-muted)]">
            Sua marca merece destaque exclusivo. Nosso construtor /sua-marca cria
            uma landing page premium, ultra-rápida e otimizada para conversão,
            garantindo que a primeira impressão do seu cliente seja inesquecível.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              "Layouts focados em conversão",
              "Carregamento em milissegundos",
              "Integração perfeita com agendamento",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 text-base text-[var(--ln-muted)]"
              >
                <Check className="size-5 shrink-0 text-[var(--ln-primary)]" />
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/ze-do-corte"
            className="inline-flex pt-4 text-[var(--ln-primary)] transition hover:text-white"
          >
            <MonoLabel>Ver demo ao vivo →</MonoLabel>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

export function StitchIntelligence() {
  const items = [
    {
      id: "agenda",
      title: "Agenda em segundos",
      body: "Serviço, horário, confirmação. Fluido no mobile — sem App Store.",
      href: "/ze-do-corte/agendar",
      cta: "Agendar na demo",
    },
    {
      title: "Caixa e clube claros",
      body: "Relatório no balcão e assinaturas com cancelamento imediato.",
      href: "/cadastro",
      cta: "Começar trial",
    },
    {
      title: "WhatsApp que agenda",
      body: "Bot oficial Meta para remarcar, cancelar e confirmar no próprio chat.",
      href: "/cadastro",
      cta: "Ativar depois",
    },
  ];

  return (
    <section
      id="agenda"
      className="mx-auto max-w-[1440px] px-5 py-24 md:px-16 md:py-32"
    >
      <Reveal className="mb-14 max-w-2xl">
        <p className="mb-3 text-[var(--ln-primary)]">
          <MonoLabel>Operação</MonoLabel>
        </p>
        <h2 className="text-2xl font-bold tracking-tighter text-[var(--ln-on)] md:text-[56px] md:leading-[1.1]">
          Operação inteira, zero burocracia
        </h2>
      </Reveal>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item, i) => (
          <Reveal key={item.title} delay={i * 0.08}>
            <GlassCard className="flex h-full flex-col p-8">
              <h3 className="text-xl font-semibold text-[var(--ln-on)]">
                {item.title}
              </h3>
              <p className="mt-3 flex-1 text-base text-[var(--ln-muted)]">
                {item.body}
              </p>
              <Link
                href={item.href}
                className="mt-8 inline-flex text-[var(--ln-primary)] transition hover:text-white"
              >
                <MonoLabel>{item.cta} →</MonoLabel>
              </Link>
            </GlassCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function StitchFinalCta() {
  return (
    <section className="relative overflow-hidden px-5 py-28 md:px-16">
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--ln-primary-container)]/20 blur-[100px]"
      />
      <Reveal className="relative z-10 mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-extrabold tracking-tighter text-[var(--ln-on)] md:text-[56px] md:leading-[1.1]">
          Pronto em minutos.
          <br />
          Não em semanas.
        </h2>
        <p className="mx-auto mt-6 max-w-md text-[var(--ln-muted)]">
          Trial completo. Site com a cara da sua marca — e clientes te encontram
          na busca Barbernegon.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/cadastro"
            className="rounded-full bg-[var(--ln-primary)] px-8 py-4 text-[var(--ln-on-primary)] shadow-[0_0_20px_rgba(59,130,246,0.4)] transition hover:scale-95 hover:bg-[var(--ln-primary-container)] hover:text-white"
          >
            <MonoLabel>Começar agora</MonoLabel>
          </Link>
          <Link
            href={explorarHref}
            className="rounded-full border border-white/15 px-8 py-4 text-[var(--ln-muted)] transition hover:border-[var(--ln-primary)] hover:text-[var(--ln-primary)]"
          >
            <MonoLabel>Encontrar barbearia</MonoLabel>
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

export function StitchFooter() {
  return (
    <footer className="relative z-10 w-full border-t border-white/10 bg-[var(--ln-bg)] pt-24 pb-16">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-6 px-5 md:grid-cols-2 md:px-16">
        <div>
          <div className="mb-6 text-2xl font-semibold text-[var(--ln-on)]">
            Barbernegon
          </div>
          <p className="text-[var(--ln-on)]">
            <MonoLabel>
              © {new Date().getFullYear()} Barbernegon. Feito com precisão para
              barbearias exigentes.
            </MonoLabel>
          </p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-4 md:justify-end">
          {(
            [
              [explorarHref, "Barbearias"],
              ["/planos", "Planos"],
              ["/admin/login", "Painel"],
              ["/ze-do-corte", "Demonstração"],
              ["/cadastro", "Cadastro"],
            ] as const
          ).map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="text-[var(--ln-outline)] transition-all duration-300 hover:translate-x-1 hover:text-[var(--ln-primary)]"
            >
              <MonoLabel>{label}</MonoLabel>
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

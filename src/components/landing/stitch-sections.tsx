"use client";

import { motion } from "framer-motion";
import {
  BadgeCheck,
  Brush,
  CheckCircle2,
  Clock3,
  Globe2,
  MessageCircle,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

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
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.65, ease, delay }}
    >
      {children}
    </motion.div>
  );
}

function LabelCaps({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`text-[11px] leading-none font-bold tracking-[0.1em] uppercase sm:text-[12px] ${className}`}
    >
      {children}
    </span>
  );
}

export function StitchHero() {
  return (
    <section className="relative flex min-h-svh items-center justify-center overflow-hidden px-4 pt-[max(5.5rem,calc(env(safe-area-inset-top)+4.5rem))] pb-10 sm:px-6 md:pb-16">
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/landing/hero-barbershop.png"
          alt="Interior premium de barbearia com cadeiras de couro e iluminação quente"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-[rgba(16,19,26,0.75)] via-[rgba(16,19,26,0.85)] to-[rgba(16,19,26,1)]"
        />
      </div>
      <div className="relative z-10 mx-auto w-full max-w-3xl text-center">
        <Reveal>
          <h1 className="mb-3 font-[family-name:var(--font-ln-headline)] text-[1.75rem] leading-[1.12] font-bold tracking-[-0.02em] text-white sm:mb-4 sm:text-4xl md:text-[48px]">
            Sua barbearia. Sua cara.
          </h1>
          <p className="mx-auto mb-7 max-w-xl text-[15px] leading-relaxed text-[var(--ln-on-variant)] sm:mb-8 sm:text-lg sm:leading-[1.6]">
            Transforme seu negócio com uma identidade digital exclusiva. Do
            domínio próprio à gestão completa, tudo desenhado para o barbeiro de
            alto nível.
          </p>
          <div className="mx-auto flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-4">
            <Link
              href="/cadastro"
              className="inline-flex min-h-12 w-full items-center justify-center rounded bg-[var(--ln-primary-container)] px-6 py-3.5 text-center text-base font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] sm:w-auto sm:px-10 sm:text-lg md:text-xl"
            >
              Começar agora
            </Link>
            <Link
              href="/ze-do-corte"
              className="inline-flex min-h-12 w-full items-center justify-center rounded border border-[var(--ln-border)] bg-transparent px-6 py-3.5 text-center text-base font-semibold text-white transition-all hover:bg-[var(--ln-surface-container)] active:scale-[0.98] sm:w-auto sm:px-10 sm:text-lg md:text-xl"
            >
              Ver demonstração
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function StitchIdentity() {
  const cards = [
    {
      icon: Brush,
      title: "Customização Total",
      body: "Personalize cada detalhe do seu site. Cores, logos e fontes que transmitem a verdadeira essência do seu trabalho e atraem o público certo.",
    },
    {
      icon: Globe2,
      title: "Domínio Próprio",
      body: "Sua barbearia merece um endereço oficial. Utilize seu próprio domínio .com ou .com.br e eleve a percepção de valor do seu negócio.",
    },
    {
      icon: BadgeCheck,
      title: "Sem Concorrência",
      body: "Em seu site, apenas seus serviços aparecem. Diferente de marketplaces, o foco total do cliente é na sua experiência de grooming.",
    },
  ];

  return (
    <section
      id="features"
      className="bg-[var(--ln-bg)] px-4 py-12 sm:px-6 sm:py-16 md:py-20"
    >
      <div className="mx-auto max-w-[1280px]">
        <Reveal className="mb-10 text-center sm:mb-14 md:mb-16">
          <LabelCaps className="mb-2 block text-[var(--ln-primary)]">
            Identidade Real
          </LabelCaps>
          <h2 className="font-[family-name:var(--font-ln-headline)] text-xl leading-[1.25] font-semibold tracking-[-0.01em] text-[var(--ln-on)] sm:text-2xl md:text-[32px]">
            Mais que um agendamento, sua marca.
          </h2>
        </Reveal>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
          {cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.06}>
              <div className="rounded-lg border border-[var(--ln-border)] bg-[var(--ln-surface-elevated)] p-5 transition-all duration-300 sm:p-8 hover:shadow-[0_8px_24px_rgba(59,130,246,0.15)]">
                <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-[var(--ln-surface-container)] text-[var(--ln-primary)] sm:mb-6 sm:size-12">
                  <c.icon className="size-6 sm:size-7" strokeWidth={1.5} />
                </div>
                <h3 className="mb-2 font-[family-name:var(--font-ln-headline)] text-lg font-semibold text-[var(--ln-on)] sm:mb-4 sm:text-xl">
                  {c.title}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--ln-on-variant)]">
                  {c.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StitchSiteSection() {
  return (
    <section
      id="site"
      className="overflow-x-clip bg-[var(--ln-surface-low)] px-4 py-12 sm:px-6 sm:py-16 md:py-20"
    >
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <h2 className="mb-3 font-[family-name:var(--font-ln-headline)] text-xl leading-[1.25] font-semibold tracking-[-0.01em] text-[var(--ln-on)] sm:mb-4 sm:text-2xl md:text-[32px]">
            Site com a sua cara
          </h2>
          <p className="mb-6 text-[15px] leading-relaxed text-[var(--ln-on-variant)] sm:mb-8 sm:text-lg sm:leading-[1.6]">
            Nosso construtor foi feito para barbeiros que não têm tempo a
            perder. Arraste, solte e configure sua presença digital em minutos,
            com a estética de uma boutique de luxo.
          </p>
          <ul className="space-y-3 sm:space-y-4">
            {[
              "Portfólio de alta resolução",
              "Agendamento via mobile otimizado",
              "Painel de analytics integrado",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle2
                  className="mt-0.5 size-5 shrink-0 text-[var(--ln-primary)]"
                  strokeWidth={1.75}
                />
                <span className="text-[15px] text-[var(--ln-on)] sm:text-base">
                  {item}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/ze-do-corte"
            className="mt-6 inline-flex min-h-11 items-center text-[var(--ln-primary)] transition hover:text-white sm:mt-8"
          >
            <LabelCaps>Ver demo ao vivo →</LabelCaps>
          </Link>
        </Reveal>

        <Reveal className="relative">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 rounded-xl bg-[var(--ln-primary)]/10 blur-2xl sm:-inset-4"
          />
          <div className="relative overflow-hidden rounded-xl border border-[var(--ln-border)] bg-[var(--ln-surface-elevated)] shadow-2xl">
            <div className="relative aspect-[16/10] w-full">
              <Image
                src="/images/landing/builder-preview.png"
                alt="Close-up cinematográfico de barbeiro cortando cabelo com precisão"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 560px"
              />
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-[var(--ln-border)] bg-[var(--ln-bg)] p-4 sm:p-6">
              <span className="font-[family-name:var(--font-ln-headline)] text-base font-semibold text-[var(--ln-on)] sm:text-xl">
                Preview do Builder
              </span>
              <div className="flex shrink-0 gap-2">
                <span className="size-2.5 rounded-full bg-[var(--ln-error)] sm:size-3" />
                <span className="size-2.5 rounded-full bg-[var(--ln-accent-gold)] sm:size-3" />
                <span className="size-2.5 rounded-full bg-[var(--ln-primary)] sm:size-3" />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function StitchIntelligence() {
  const items = [
    {
      icon: Clock3,
      title: "Agenda em segundos",
      body: "O cliente escolhe o horário, você recebe a notificação. Sem trocas infinitas de mensagens.",
    },
    {
      icon: Wallet,
      title: "Caixa e clube",
      body: "Gestão financeira integrada e planos de assinatura para fidelizar seus melhores clientes.",
    },
    {
      icon: MessageCircle,
      title: "WhatsApp que agenda",
      body: "Integração nativa com WhatsApp Business para agendamentos automáticos e lembretes.",
    },
  ];

  return (
    <section
      id="operations"
      className="bg-[var(--ln-bg)] px-4 py-12 sm:px-6 sm:py-16 md:py-20"
    >
      <div className="mx-auto max-w-[1280px]">
        <Reveal className="mb-10 flex flex-col items-start justify-between gap-4 sm:mb-14 sm:gap-8 md:mb-16 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <LabelCaps className="mb-2 block text-[var(--ln-primary)]">
              Eficiência
            </LabelCaps>
            <h2 className="font-[family-name:var(--font-ln-headline)] text-xl leading-[1.25] font-semibold tracking-[-0.01em] text-[var(--ln-on)] sm:text-2xl md:text-[32px]">
              Operação inteira, zero burocracia.
            </h2>
          </div>
          <p className="max-w-sm text-[15px] text-[var(--ln-on-variant)] sm:text-base">
            Deixe a tecnologia cuidar do fluxo enquanto você foca na navalha.
          </p>
        </Reveal>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3 md:gap-8">
          {items.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.06}>
              <div className="flex flex-col gap-3 border-l border-[var(--ln-border)] py-2 pr-2 pl-5 transition-colors sm:gap-4 sm:p-8 hover:border-[var(--ln-primary)]">
                <item.icon
                  className="size-8 text-[var(--ln-outline)] sm:size-9"
                  strokeWidth={1.25}
                />
                <h3 className="font-[family-name:var(--font-ln-headline)] text-lg font-semibold text-[var(--ln-on)] sm:text-xl">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--ln-on-variant)]">
                  {item.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StitchFinalCta() {
  return (
    <section className="relative overflow-hidden bg-[var(--ln-surface-lowest)] px-4 py-12 sm:px-6 sm:py-16 md:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 size-[min(100vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--ln-primary)]/5 blur-[80px] sm:size-[800px] sm:blur-[120px]"
      />
      <Reveal className="relative z-10 mx-auto max-w-[1280px] text-center">
        <h2 className="mb-3 font-[family-name:var(--font-ln-headline)] text-[1.75rem] leading-[1.12] font-bold tracking-[-0.02em] text-white sm:mb-4 sm:text-4xl md:text-[48px]">
          Pronto em minutos.
          <br className="sm:hidden" /> Não em semanas.
        </h2>
        <p className="mx-auto mb-7 max-w-2xl text-[15px] leading-relaxed text-[var(--ln-on-variant)] sm:mb-8 sm:text-lg sm:leading-[1.6]">
          Junte-se à elite das barbearias que já automatizaram seu sucesso com o
          Barbernegon.
        </p>
        <Link
          href="/cadastro"
          className="inline-flex min-h-12 w-full max-w-sm items-center justify-center rounded-lg bg-[var(--ln-primary-container)] px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-[var(--ln-primary)]/20 transition-all hover:brightness-110 active:scale-[0.98] sm:w-auto sm:max-w-none sm:px-12 sm:py-5 sm:text-xl"
        >
          Começar minha jornada grátis
        </Link>
      </Reveal>
    </section>
  );
}

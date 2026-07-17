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
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, ease, delay }}
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
      className={`text-[12px] leading-none font-bold tracking-[0.1em] uppercase ${className}`}
    >
      {children}
    </span>
  );
}

export function StitchHero() {
  return (
    <section className="relative flex h-svh items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/landing/hero-barbershop.png"
          alt="Interior premium de barbearia com cadeiras de couro e iluminação quente"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-[rgba(16,19,26,0.7)] to-[rgba(16,19,26,1)]"
        />
      </div>
      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center md:px-6">
        <Reveal>
          <h1 className="mb-4 font-[family-name:var(--font-ln-headline)] text-[32px] leading-[1.1] font-bold tracking-[-0.02em] text-white md:text-[48px]">
            Sua barbearia. Sua cara.
          </h1>
          <p className="mb-8 text-lg leading-[1.6] text-[var(--ln-on-variant)] md:text-lg">
            Transforme seu negócio com uma identidade digital exclusiva. Do
            domínio próprio à gestão completa, tudo desenhado para o barbeiro de
            alto nível.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/cadastro"
              className="w-full rounded bg-[var(--ln-primary-container)] px-10 py-4 text-center text-xl font-semibold text-white transition-all hover:brightness-110 sm:w-auto"
            >
              Começar agora
            </Link>
            <Link
              href="/ze-do-corte"
              className="w-full rounded border-[1.5px] border-[var(--ln-border)] bg-transparent px-10 py-4 text-center text-xl font-semibold text-white transition-all hover:bg-[var(--ln-surface-container)] sm:w-auto"
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
    <section id="features" className="bg-[var(--ln-bg)] px-4 py-16 md:px-6 md:py-20">
      <div className="mx-auto max-w-[1280px]">
        <Reveal className="mb-16 text-center">
          <LabelCaps className="mb-2 block text-[var(--ln-primary)]">
            Identidade Real
          </LabelCaps>
          <h2 className="font-[family-name:var(--font-ln-headline)] text-2xl leading-[1.2] font-semibold tracking-[-0.01em] text-[var(--ln-on)] md:text-[32px]">
            Mais que um agendamento, sua marca.
          </h2>
        </Reveal>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.08}>
              <div className="rounded-lg border border-[var(--ln-border)] bg-[var(--ln-surface-elevated)] p-8 transition-all duration-300 hover:shadow-[0_8px_24px_rgba(59,130,246,0.15)]">
                <div className="mb-6 flex size-12 items-center justify-center rounded-lg bg-[var(--ln-surface-container)] text-[var(--ln-primary)]">
                  <c.icon className="size-7" strokeWidth={1.5} />
                </div>
                <h3 className="mb-4 font-[family-name:var(--font-ln-headline)] text-xl font-semibold text-[var(--ln-on)]">
                  {c.title}
                </h3>
                <p className="text-sm leading-[1.5] text-[var(--ln-on-variant)]">
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
      className="bg-[var(--ln-surface-low)] px-4 py-16 md:px-6 md:py-20"
    >
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-16 lg:grid-cols-2">
        <Reveal>
          <h2 className="mb-4 font-[family-name:var(--font-ln-headline)] text-2xl leading-[1.2] font-semibold tracking-[-0.01em] text-[var(--ln-on)] md:text-[32px]">
            Site com a sua cara
          </h2>
          <p className="mb-8 text-lg leading-[1.6] text-[var(--ln-on-variant)]">
            Nosso construtor foi feito para barbeiros que não têm tempo a
            perder. Arraste, solte e configure sua presença digital em minutos,
            com a estética de uma boutique de luxo.
          </p>
          <ul className="space-y-4">
            {[
              "Portfólio de alta resolução",
              "Agendamento via mobile otimizado",
              "Painel de analytics integrado",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <CheckCircle2
                  className="size-5 shrink-0 text-[var(--ln-primary)]"
                  strokeWidth={1.75}
                />
                <span className="text-base text-[var(--ln-on)]">{item}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/ze-do-corte"
            className="mt-8 inline-flex text-[var(--ln-primary)] transition hover:text-white"
          >
            <LabelCaps>Ver demo ao vivo →</LabelCaps>
          </Link>
        </Reveal>

        <Reveal className="relative group">
          <div
            aria-hidden
            className="absolute -inset-4 rounded-xl bg-[var(--ln-primary)]/10 blur-2xl transition-all group-hover:bg-[var(--ln-primary)]/20"
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
            <div className="flex items-center justify-between border-t border-[var(--ln-border)] bg-[var(--ln-bg)] p-6">
              <span className="font-[family-name:var(--font-ln-headline)] text-xl font-semibold text-[var(--ln-on)]">
                Preview do Builder
              </span>
              <div className="flex gap-2">
                <span className="size-3 rounded-full bg-[var(--ln-error)]" />
                <span className="size-3 rounded-full bg-[var(--ln-accent-gold)]" />
                <span className="size-3 rounded-full bg-[var(--ln-primary)]" />
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
      className="bg-[var(--ln-bg)] px-4 py-16 md:px-6 md:py-20"
    >
      <div className="mx-auto max-w-[1280px]">
        <Reveal className="mb-16 flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <LabelCaps className="mb-2 block text-[var(--ln-primary)]">
              Ecoeficiência
            </LabelCaps>
            <h2 className="font-[family-name:var(--font-ln-headline)] text-2xl leading-[1.2] font-semibold tracking-[-0.01em] text-[var(--ln-on)] md:text-[32px]">
              Operação inteira, zero burocracia.
            </h2>
          </div>
          <p className="max-w-sm text-base text-[var(--ln-on-variant)]">
            Deixe a tecnologia cuidar do fluxo enquanto você foca na navalha.
          </p>
        </Reveal>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {items.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.08}>
              <div className="flex flex-col gap-4 border-l border-[var(--ln-border)] p-8 transition-colors hover:border-[var(--ln-primary)]">
                <item.icon
                  className="size-9 text-[var(--ln-outline)]"
                  strokeWidth={1.25}
                />
                <h3 className="font-[family-name:var(--font-ln-headline)] text-xl font-semibold text-[var(--ln-on)]">
                  {item.title}
                </h3>
                <p className="text-sm leading-[1.5] text-[var(--ln-on-variant)]">
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
    <section className="relative overflow-hidden bg-[var(--ln-surface-lowest)] px-4 py-16 md:px-6 md:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 size-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--ln-primary)]/5 blur-[120px]"
      />
      <Reveal className="relative z-10 mx-auto max-w-[1280px] text-center">
        <h2 className="mb-4 font-[family-name:var(--font-ln-headline)] text-[32px] leading-[1.1] font-bold tracking-[-0.02em] text-white md:text-[48px]">
          Pronto em minutos. Não em semanas.
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-lg leading-[1.6] text-[var(--ln-on-variant)]">
          Junte-se à elite das barbearias que já automatizaram seu sucesso com o
          Barbernegon.
        </p>
        <Link
          href="/cadastro"
          className="inline-flex rounded-lg bg-[var(--ln-primary-container)] px-12 py-5 text-xl font-semibold text-white shadow-lg shadow-[var(--ln-primary)]/20 transition-all hover:brightness-110 active:scale-95"
        >
          Começar minha jornada grátis
        </Link>
      </Reveal>
    </section>
  );
}

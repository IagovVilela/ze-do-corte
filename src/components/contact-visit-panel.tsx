"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CalendarClock, Phone } from "lucide-react";

import {
  BARBER_CONTACT_LINKS,
  BARBER_SLOGAN_PRIMARY,
  BARBER_SLOGAN_SECONDARY,
  BARBER_WEEKLY_SCHEDULE,
} from "@/lib/constants";
import {
  getInstagramContactHref,
  getWhatsappContactHref,
} from "@/lib/contact-links";
import { InstagramIcon, WhatsappIcon } from "@/components/icons";
import { LordIconAnimated } from "@/components/lord-icon-animated";

export function ContactVisitPanel() {
  const reduceMotion = useReducedMotion();
  const [ctaHover, setCtaHover] = useState(false);
  const { telHref, telLabel, instagramUser } = BARBER_CONTACT_LINKS;
  const showTel = Boolean(telHref && telLabel);
  const waHref = getWhatsappContactHref();
  const igHref = getInstagramContactHref();
  const showWa = Boolean(waHref);
  const showIg = Boolean(igHref);

  return (
    <motion.article
      whileHover={reduceMotion ? undefined : { y: -4, scale: 1.005 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className="glass-card flex h-full min-h-[320px] flex-col overflow-hidden rounded-2xl"
    >
      <div className="border-b border-white/[0.06] p-6 pb-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
            <LordIconAnimated
              slot="schedule"
              size={40}
              label="Calendário e horários"
              fallback={<CalendarClock className="h-5 w-5 text-brand-300" aria-hidden />}
            />
          </span>
          <div>
            <h3 className="text-xl font-semibold text-zinc-100">Horário & visita</h3>
            <p className="mt-1 text-sm leading-relaxed text-zinc-400">
              Reserve com antecedência e chegue no horário — assim mantemos o fluxo tranquilo para
              todos.
            </p>
          </div>
        </div>
      </div>

      <ul className="divide-y divide-white/[0.06] px-6">
        {BARBER_WEEKLY_SCHEDULE.map((row) => (
          <li
            key={row.label}
            className="flex items-baseline justify-between gap-4 py-3.5 text-sm first:pt-4"
          >
            <span className="font-medium text-zinc-200">{row.label}</span>
            <span
              className={
                row.range === "Fechado"
                  ? "shrink-0 text-zinc-500"
                  : "shrink-0 tabular-nums text-zinc-300"
              }
            >
              {row.range}
            </span>
          </li>
        ))}
      </ul>

      <div className="relative flex flex-1 flex-col justify-end px-6 pb-2 pt-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(520px_200px_at_70%_80%,rgba(250,204,21,0.12),transparent_70%),radial-gradient(380px_180px_at_20%_100%,rgba(59,130,246,0.1),transparent_65%)]"
        />
        <blockquote className="relative z-[1] font-display text-xl font-medium leading-snug tracking-tight text-zinc-100 md:text-2xl">
          {BARBER_SLOGAN_PRIMARY}
        </blockquote>
        <p className="relative z-[1] mt-3 max-w-md text-sm text-zinc-500">
          {BARBER_SLOGAN_SECONDARY} Escolha o melhor horário no site para o seu corte ou barba.
        </p>
      </div>

      <div className="space-y-4 p-6 pt-2">
        <Link
          href="/agendar"
          onMouseEnter={() => setCtaHover(true)}
          onMouseLeave={() => setCtaHover(false)}
          onFocus={() => setCtaHover(true)}
          onBlur={() => setCtaHover(false)}
          className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-700 to-brand-500 px-5 py-3.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-brand-900/30 transition hover:from-brand-500 hover:to-brand-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
        >
          Reservar horário
          <LordIconAnimated
            slot="arrow"
            size={20}
            label=""
            siblingHover={ctaHover}
            colors="primary:#18181b,secondary:#27272a"
            className="transition group-hover:translate-x-0.5"
            fallback={<ArrowRight className="h-4 w-4" aria-hidden />}
          />
        </Link>

        {(showTel || showWa || showIg) && (
          <div className="flex flex-wrap gap-2">
            {showTel ? (
              <a
                href={telHref}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.07]"
              >
                <LordIconAnimated
                  slot="phone"
                  size={18}
                  label="Telefone"
                  colors="primary:#fcd34d,secondary:#a1a1aa"
                  fallback={<Phone className="h-3.5 w-3.5 text-brand-300" aria-hidden />}
                />
                {telLabel}
              </a>
            ) : null}
            {showWa ? (
              <a
                href={waHref!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.07]"
              >
                <WhatsappIcon className="h-[18px] w-[18px]" aria-hidden />
                WhatsApp
              </a>
            ) : null}
            {showIg ? (
              <a
                href={igHref!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.07]"
              >
                <InstagramIcon className="h-[18px] w-[18px]" aria-hidden />
                {instagramUser ? `@${instagramUser.replace(/^@/, "")}` : "Instagram"}
              </a>
            ) : null}
          </div>
        )}
      </div>
    </motion.article>
  );
}

"use client";

import { motion } from "framer-motion";
import { ArrowRight, CalendarClock, Sparkles } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="container-max relative overflow-hidden pt-24 pb-16 md:pt-28 md:pb-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="pointer-events-none absolute -top-20 right-0 h-72 w-72 rounded-full bg-brand-500/15 blur-3xl"
      />
      <div className="grid items-center gap-10 md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold tracking-[0.25em] text-zinc-300 uppercase"
          >
            <Sparkles className="h-3.5 w-3.5 text-brand-300" />
            Experiência premium
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="max-w-2xl text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl"
          >
            Seu corte impecável com um <span className="heading-gradient">agendamento sem atrito</span>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="max-w-xl text-base leading-relaxed text-zinc-300 md:text-lg"
          >
            No Zé do Corte, tradição e modernidade se encontram para oferecer atendimento de alto padrão.
            Escolha seu serviço, reserve seu horário e chegue sabendo que sua experiência já começou.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <Link
              href="/agendar"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-zinc-950 transition hover:scale-[1.02] hover:bg-brand-300"
            >
              <CalendarClock className="h-4 w-4" />
              Agendar agora
            </Link>
            <a
              href="#servicos"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Ver serviços
              <ArrowRight className="h-4 w-4" />
            </a>
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7 }}
          className="glass-card rounded-3xl p-5"
        >
          <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-5">
            <p className="text-xs font-medium tracking-[0.25em] text-zinc-400 uppercase">Hoje no estúdio</p>
            <div className="mt-4 space-y-4">
              {[
                { time: "09:00", name: "Corte + Barba", status: "Confirmado" },
                { time: "11:30", name: "Pacote Premium", status: "Confirmado" },
                { time: "16:00", name: "Corte Social", status: "Disponível" },
              ].map((slot) => (
                <div
                  key={`${slot.time}-${slot.name}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{slot.time}</p>
                    <p className="text-xs text-zinc-400">{slot.name}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-semibold tracking-wide uppercase ${
                      slot.status === "Disponível"
                        ? "bg-emerald-400/20 text-emerald-300"
                        : "bg-blue-400/20 text-blue-300"
                    }`}
                  >
                    {slot.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

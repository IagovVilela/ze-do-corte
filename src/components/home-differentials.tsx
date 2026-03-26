"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheck, Sparkles, Timer } from "lucide-react";

import { StaggerReveal, staggerItem } from "@/components/motion-stagger";

const items = [
  {
    title: "Atendimento premium",
    description:
      "Recepção personalizada, ambiente confortável e experiência completa em cada visita.",
    icon: Sparkles,
  },
  {
    title: "Pontualidade e precisão",
    description:
      "Agenda inteligente para evitar esperas desnecessárias e garantir atendimento no horário.",
    icon: Timer,
  },
  {
    title: "Profissionais especialistas",
    description:
      "Equipe experiente em cortes modernos, barba desenhada e consultoria de estilo.",
    icon: ShieldCheck,
  },
] as const;

export function HomeDifferentials() {
  const reduceMotion = useReducedMotion();

  return (
    <StaggerReveal className="mt-8 grid gap-5 md:grid-cols-3" stagger={0.12} delayChildren={0.1}>
      {items.map((item) => (
        <motion.article
          key={item.title}
          variants={staggerItem}
          whileHover={
            reduceMotion
              ? undefined
              : { y: -10, scale: 1.02, transition: { type: "spring", stiffness: 320, damping: 24 } }
          }
          className="glass-card group rounded-2xl p-6"
        >
          <motion.span
            className="inline-flex rounded-xl bg-white/[0.06] p-2.5 ring-1 ring-white/10"
            whileHover={
              reduceMotion ? undefined : { scale: 1.08, rotate: [0, -6, 6, 0] }
            }
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
          >
            <item.icon className="h-8 w-8 text-brand-300" aria-hidden />
          </motion.span>
          <h3 className="mt-4 text-xl font-semibold text-white">{item.title}</h3>
          <p className="mt-2 text-sm text-zinc-300">{item.description}</p>
        </motion.article>
      ))}
    </StaggerReveal>
  );
}

"use client";

import { motion, useReducedMotion } from "framer-motion";

type ContactCardProps = {
  title: string;
  subtitle: string;
};

export function ContactCard({ title, subtitle }: ContactCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      whileHover={
        reduceMotion
          ? undefined
          : { y: -5, scale: 1.01, transition: { type: "spring", stiffness: 280, damping: 24 } }
      }
      className="glass-card rounded-2xl p-6"
    >
      <h3 className="text-xl font-semibold text-zinc-100">{title}</h3>
      <p className="mt-2 text-sm text-zinc-300">{subtitle}</p>
    </motion.article>
  );
}

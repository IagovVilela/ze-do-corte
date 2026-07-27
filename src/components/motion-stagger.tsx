"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { PropsWithChildren } from "react";

import { staggerContainer } from "@/lib/motion-presets";

type StaggerRevealProps = PropsWithChildren<{
  className?: string;
  /** Fração da seção visível para disparar (0–1). */
  amount?: number | "some" | "all";
  stagger?: number;
  delayChildren?: number;
}>;

/**
 * Container com stagger nos filhos — cada filho deve ser `motion.*` com `variants={staggerItem}`.
 */
export function StaggerReveal({
  children,
  className,
  amount = 0.02,
  stagger = 0.1,
  delayChildren = 0.06,
}: StaggerRevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      // `amount` baixo + margem: cards altos (equipe) dentro de frames do canvas
      // não ficam presos em opacity:0 no mobile.
      viewport={{ once: true, amount, margin: "80px 0px" }}
      variants={staggerContainer(stagger, delayChildren)}
    >
      {children}
    </motion.div>
  );
}

export { staggerItem, staggerItemTight } from "@/lib/motion-presets";

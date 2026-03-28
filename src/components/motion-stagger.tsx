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
  amount = 0.18,
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
      viewport={{ once: true, amount }}
      variants={staggerContainer(stagger, delayChildren)}
    >
      {children}
    </motion.div>
  );
}

export { staggerItem, staggerItemTight } from "@/lib/motion-presets";

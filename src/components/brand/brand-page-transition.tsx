"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

/**
 * Transição de entrada entre páginas públicas (Home ↔ Explorar ↔ Favoritos).
 * No mobile: só fade (sem blur) para evitar jank.
 */
export function BrandPageTransition({ children }: Props) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      key={pathname}
      initial={
        reduceMotion
          ? false
          : { opacity: 0, y: 10 }
      }
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.32,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="min-h-[calc(100svh-5rem)]"
    >
      {children}
    </motion.div>
  );
}

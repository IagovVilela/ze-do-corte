"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

/**
 * Transição de entrada entre páginas públicas (Home ↔ Explorar ↔ Favoritos).
 * A nav/footer ficam fora deste wrapper e permanecem estáveis.
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
          : { opacity: 0, y: 16, filter: "blur(6px)" }
      }
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{
        duration: reduceMotion ? 0 : 0.42,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="min-h-[calc(100svh-5rem)]"
    >
      {children}
    </motion.div>
  );
}

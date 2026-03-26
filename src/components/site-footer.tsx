"use client";

import { motion, useReducedMotion } from "framer-motion";

import { BrandLogo } from "@/components/brand-logo";
import { BARBER_SLOGAN_SECONDARY } from "@/lib/constants";

type SiteFooterProps = {
  showPitch?: boolean;
};

export function SiteFooter({ showPitch = true }: SiteFooterProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.footer
      initial={reduceMotion ? false : { opacity: 0, y: 28, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px", amount: 0.3 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 76, damping: 20, mass: 0.9 }
      }
      className="border-t border-white/10 py-8"
    >
      <div className="container-max flex flex-col gap-4 text-center text-sm text-zinc-400 md:flex-row md:items-center md:justify-between md:text-left">
        <motion.div
          className="flex flex-col items-center gap-3 md:flex-row md:items-center md:gap-4"
          whileHover={reduceMotion ? undefined : { x: 2 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
        >
          <BrandLogo size={48} className="h-12 w-12" />
          <p>© {new Date().getFullYear()} Zé do Corte. Todos os direitos reservados.</p>
        </motion.div>
        {showPitch ? <p className="max-w-sm text-zinc-500">{BARBER_SLOGAN_SECONDARY}</p> : null}
      </div>
    </motion.footer>
  );
}

"use client";

import { motion } from "framer-motion";

type SiteFooterProps = {
  showPitch?: boolean;
};

export function SiteFooter({ showPitch = true }: SiteFooterProps) {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.4 }}
      className="border-t border-white/10 py-8"
    >
      <div className="container-max flex flex-col gap-4 text-center text-sm text-zinc-400 md:flex-row md:items-center md:justify-between md:text-left">
        <p>© {new Date().getFullYear()} Zé do Corte. Todos os direitos reservados.</p>
        {showPitch ? (
          <p>Desenvolvido para converter mais clientes com experiência premium.</p>
        ) : null}
      </div>
    </motion.footer>
  );
}

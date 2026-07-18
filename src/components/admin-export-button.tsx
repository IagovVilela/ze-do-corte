"use client";

import { motion } from "framer-motion";
import { Download } from "lucide-react";

type Props = {
  /** Funcionários não exportam dados. */
  canExport?: boolean;
};

export function AdminExportButton({ canExport = true }: Props) {
  if (!canExport) return null;

  return (
    <motion.a
      href="/api/admin/export"
      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--bn-primary)]/35 bg-[var(--bn-primary-container)]/12 px-5 py-2.5 text-sm font-semibold text-[var(--bn-primary)] transition hover:bg-[var(--bn-primary-container)]/20"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Download className="h-4 w-4" />
      Exportar Excel
    </motion.a>
  );
}

"use client";

import { motion } from "framer-motion";
import { Download } from "lucide-react";

export function AdminExportButton() {
  return (
    <motion.a
      href="/api/admin/export"
      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-brand-500/40 bg-brand-500/15 px-5 py-2.5 text-sm font-semibold text-brand-200 transition hover:bg-brand-500/25"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Download className="h-4 w-4" />
      Exportar Excel
    </motion.a>
  );
}

"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import type { DashboardSummaryRow } from "@/lib/types";

type Props = {
  rows: DashboardSummaryRow[];
  /** Texto sob o título (contexto dos filtros / período). */
  description?: string;
  /** Formulário GET de filtros (mesmos parâmetros que a lista). */
  filtersSlot?: ReactNode;
};

export function DashboardSummaryTable({
  rows,
  description = "Indicadores consolidados conforme seu papel e unidades.",
  filtersSlot,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08 }}
      className="glass-card overflow-hidden rounded-2xl"
    >
      <div className="border-b border-[var(--bn-border)] px-5 py-4">
        <h3 className="font-display text-lg font-normal uppercase tracking-wide text-[var(--bn-on)]">
          Resumo operacional
        </h3>
        <p className="mt-0.5 text-sm text-[var(--bn-muted)]">{description}</p>
      </div>
      {filtersSlot ? <div>{filtersSlot}</div> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-[var(--bn-muted)]">
            <tr>
              <th className="px-5 py-3 font-medium">Indicador</th>
              <th className="px-5 py-3 font-medium">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-[var(--bn-on-variant)]">
            {rows.map((row) => (
              <tr key={row.label} className="transition-colors hover:bg-[var(--bn-hover)]">
                <td className="px-5 py-3.5 align-top">
                  <span className="font-medium text-[var(--bn-on)]">{row.label}</span>
                  {row.hint ? (
                    <p className="mt-0.5 text-xs font-normal text-[var(--bn-muted)]">
                      {row.hint}
                    </p>
                  ) : null}
                </td>
                <td className="px-5 py-3.5 align-top text-[var(--bn-on)] tabular-nums">
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

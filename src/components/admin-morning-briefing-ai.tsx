"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

/**
 * Substitui o antigo “Gerar resumo do dia” genérico:
 * CTA direto para o Braço Direito.
 */
export function AdminMorningBriefingAi() {
  return (
    <div className="mt-4 border-t border-[var(--bn-border)] pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-[var(--bn-muted)] uppercase">
            <Sparkles className="size-3.5 text-[var(--bn-primary)]" />
            Braço Direito
          </p>
          <p className="mt-1 text-sm text-[var(--bn-muted)]">
            Comparativos, gráficos e ações de retenção — análise da operação.
          </p>
        </div>
        <Link
          href="/admin/inteligencia"
          className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--bn-primary)]/40 bg-[var(--bn-primary)]/15 px-3.5 py-1.5 text-xs font-semibold text-[var(--bn-primary)] hover:bg-[var(--bn-primary)]/25"
        >
          Abrir análise da operação
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

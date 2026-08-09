"use client";

import Link from "next/link";
import { ArrowRight, LoaderCircle, Sparkles } from "lucide-react";
import { useState } from "react";

import type { DashboardRange } from "@/lib/dashboard-period";

type Narrative = {
  summary: string;
  actions: [string, string, string] | string[];
  actionHrefs?: [string, string, string] | string[];
  source: "llm" | "rules";
};

type Props = {
  chartRange: DashboardRange;
};

export function AdminReportsPeriodAi({ chartRange }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [narrative, setNarrative] = useState<Narrative | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai/reports-narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chartRange }),
      });
      const data = (await res.json().catch(() => null)) as {
        message?: string;
        narrative?: Narrative;
      } | null;
      if (!res.ok) {
        throw new Error(data?.message ?? "Não foi possível gerar a leitura.");
      }
      if (!data?.narrative?.summary) {
        throw new Error("Resposta inválida.");
      }
      setNarrative(data.narrative);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold tracking-wide text-[var(--bn-muted)] uppercase">
            Leitura do período
          </p>
          <p className="mt-0.5 text-sm text-[var(--bn-muted)]">
            Resumo acionável com base nos números desta tela.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void generate()}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--bn-primary)]/40 bg-[var(--bn-primary)]/15 px-3.5 py-2 text-xs font-semibold text-[var(--bn-primary)] transition hover:bg-[var(--bn-primary)]/25 disabled:opacity-50"
        >
          {busy ? (
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="size-3.5" aria-hidden />
          )}
          {busy ? "Gerando…" : narrative ? "Atualizar leitura" : "Gerar leitura"}
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-xs text-[var(--bn-status-danger)]" role="alert">
          {error}
        </p>
      ) : null}

      {narrative ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm leading-relaxed text-[var(--bn-on)]">
            {narrative.summary}
          </p>
          <ol className="space-y-2">
            {narrative.actions.slice(0, 3).map((a, i) => {
              const href = narrative.actionHrefs?.[i];
              return (
                <li
                  key={`${i}-${a}`}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-[var(--bn-border)] bg-[var(--bn-surface-elevated)]/40 px-3 py-2 text-sm text-[var(--bn-on-variant)]"
                >
                  <span>
                    <span className="mr-2 font-semibold text-[var(--bn-muted)]">
                      {i + 1}.
                    </span>
                    {a}
                  </span>
                  {href ? (
                    <Link
                      href={href}
                      className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--bn-primary)] hover:underline"
                    >
                      Abrir
                      <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ol>
          <p className="text-[10px] text-[var(--bn-muted)]">
            Fonte: {narrative.source === "llm" ? "IA" : "regras do sistema"}
          </p>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight, LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { DashboardRange } from "@/lib/dashboard-period";

type Narrative = {
  summary: string;
  urgent: { title: string; detail: string; href: string };
  opportunities: { title: string; detail: string; href: string }[];
  source: "llm" | "rules";
  cached?: boolean;
};

type Props = {
  chartRange: DashboardRange;
  /** Dispara análise automaticamente ao abrir a página. */
  autoRun?: boolean;
};

export function AdminRightHandInsights({
  chartRange,
  autoRun = true,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [narrative, setNarrative] = useState<Narrative | null>(null);
  const lastRange = useRef<string | null>(null);

  async function run(forceRefresh = false) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai/right-hand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chartRange, forceRefresh }),
      });
      const data = (await res.json().catch(() => null)) as {
        message?: string;
        narrative?: Narrative;
      } | null;
      if (!res.ok || !data?.narrative) {
        throw new Error(data?.message ?? "Não foi possível gerar a análise.");
      }
      setNarrative(data.narrative);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!autoRun) return;
    if (lastRange.current === chartRange) return;
    lastRange.current = chartRange;
    setNarrative(null);
    void run(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao mudar período
  }, [chartRange, autoRun]);

  return (
    <div
      id="leitura-consultor"
      className="rounded-2xl border border-[var(--bn-primary)]/30 bg-[var(--bn-primary)]/10 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-[var(--bn-muted)] uppercase">
            <Sparkles className="size-3.5 text-[var(--bn-primary)]" />
            Leitura do consultor
          </p>
          <p className="mt-1 text-sm text-[var(--bn-muted)]">
            1 urgência + oportunidades — direto ao ponto.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(Boolean(narrative))}
          className="inline-flex min-h-9 items-center gap-2 rounded-full bg-[var(--bn-primary)] px-4 py-2 text-xs font-semibold text-zinc-950 hover:opacity-90 disabled:opacity-60"
        >
          {busy ? (
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="size-3.5" aria-hidden />
          )}
          {busy
            ? "Analisando…"
            : narrative
              ? "Atualizar análise"
              : "Análise da operação"}
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-[var(--bn-status-danger)]" role="alert">
          {error}
        </p>
      ) : null}

      {!narrative && busy ? (
        <p className="mt-4 text-sm text-[var(--bn-muted)]">
          Montando a leitura com os números deste período…
        </p>
      ) : null}

      {narrative ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm leading-relaxed text-[var(--bn-on)]">
            {narrative.summary}
          </p>

          <div className="rounded-xl border border-[var(--bn-status-danger)]/30 bg-[var(--bn-status-danger)]/10 p-3">
            <p className="text-[10px] font-bold tracking-wide text-[var(--bn-status-danger)] uppercase">
              Faça agora
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--bn-on)]">
              {narrative.urgent.title}
            </p>
            <p className="mt-1 text-xs text-[var(--bn-muted)]">
              {narrative.urgent.detail}
            </p>
            <Link
              href={narrative.urgent.href}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--bn-primary)] hover:underline"
            >
              Abrir
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {narrative.opportunities.map((o) => (
              <li
                key={o.title}
                className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface)]/70 p-3"
              >
                <p className="text-sm font-semibold text-[var(--bn-on)]">
                  {o.title}
                </p>
                <p className="mt-1 text-xs text-[var(--bn-muted)]">{o.detail}</p>
                <Link
                  href={o.href}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--bn-primary)] hover:underline"
                >
                  Abrir
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-[var(--bn-muted)]">
            Fonte: {narrative.source === "llm" ? "IA" : "regras do sistema"}
            {narrative.cached ? " · cache" : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}

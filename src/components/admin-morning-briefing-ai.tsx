"use client";

import { useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";

import type { MorningBriefingFacts } from "@/lib/admin-morning-briefing";

type Narrative = {
  summary: string;
  positiveHypothesis: string;
  alertHypothesis: string;
  cached: boolean;
  source: "llm" | "rules";
};

type Props = {
  facts: MorningBriefingFacts;
};

export function AdminMorningBriefingAi({ facts }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [narrative, setNarrative] = useState<Narrative | null>(null);

  async function load(forceRefresh = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/morning-briefing/narrative", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facts, forceRefresh }),
      });
      const json = (await res.json()) as {
        narrative?: Narrative;
        message?: string;
      };
      if (!res.ok || !json.narrative) {
        setError(json.message ?? "Não foi possível gerar o resumo.");
        return;
      }
      setNarrative(json.narrative);
    } catch {
      setError("Falha de rede ao gerar o resumo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 border-t border-[var(--bn-border)] pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-[var(--bn-muted)] uppercase">
          <Sparkles className="size-3.5 text-[var(--bn-primary)]" />
          Resumo inteligente
        </p>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load(Boolean(narrative))}
          className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--bn-border)] bg-[var(--bn-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--bn-on)] hover:bg-[var(--bn-hover)] disabled:opacity-60"
        >
          {loading ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          {narrative ? "Atualizar resumo" : "Gerar resumo do dia"}
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-rose-300">{error}</p>
      ) : null}

      {narrative ? (
        <div className="mt-3 space-y-3 text-sm text-[var(--bn-on)]">
          <p className="leading-relaxed text-[var(--bn-on-variant)]">
            {narrative.summary}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <p className="rounded-xl border border-[var(--bn-status-ok)]/25 bg-[var(--bn-status-ok)]/10 px-3 py-2 text-xs leading-relaxed">
              <span className="font-semibold text-[var(--bn-status-ok)]">
                Lado positivo:{" "}
              </span>
              {narrative.positiveHypothesis}
            </p>
            <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed">
              <span className="font-semibold text-amber-300">Atenção: </span>
              {narrative.alertHypothesis}
            </p>
          </div>
          <p className="text-[11px] text-[var(--bn-muted)]">
            Fonte: {narrative.source === "llm" ? "IA" : "regras do sistema"}
            {narrative.cached ? " · cache de hoje" : ""}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-xs text-[var(--bn-muted)]">
          Gera um texto curto com hipóteses positivas e alertas a partir dos
          números do briefing (sem enviar telefones de clientes).
        </p>
      )}
    </div>
  );
}

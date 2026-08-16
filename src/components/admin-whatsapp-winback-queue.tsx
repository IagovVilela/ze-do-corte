"use client";

import { useCallback, useEffect, useState } from "react";

type Candidate = {
  phoneKey: string;
  displayName: string | null;
  visitCount: number;
  usualGapDays: number;
  daysSinceLast: number;
};

type Payload = {
  candidates: Candidate[];
  usedThisMonth: number;
  monthlyCap: number;
  templateConfigured: boolean;
  message?: string;
  code?: string;
};

export function AdminWhatsAppWinbackQueue() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/admin/whatsapp/winback", {
      credentials: "same-origin",
    });
    const json = (await res.json()) as Payload;
    if (res.status === 403) {
      setForbidden(true);
      setData(null);
      return;
    }
    if (!res.ok) {
      setError(json.message ?? "Não foi possível carregar a fila.");
      return;
    }
    setForbidden(false);
    setData(json);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendOne(phoneKey: string) {
    setSending(phoneKey);
    setError(null);
    try {
      const res = await fetch("/api/admin/whatsapp/winback", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneKey }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(json.message ?? "Falha no envio.");
        return;
      }
      await load();
    } finally {
      setSending(null);
    }
  }

  if (forbidden) {
    return (
      <section className="rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)]/40 p-5">
        <h2 className="font-display text-lg text-[var(--bn-on)]">
          Reativação inteligente (Plus+)
        </h2>
        <p className="mt-2 text-sm text-[var(--bn-muted)]">
          Detecta quem atrasou o corte no prazo dele e envia template da Meta
          (você aprova cada envio). Assine o Plus+ em{" "}
          <a href="/admin/plano" className="text-[var(--bn-primary)] underline">
            Seu plano
          </a>
          . A fatura das mensagens é da Meta, no cartão do salão.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)]/40 p-5">
      <h2 className="font-display text-lg text-[var(--bn-on)]">
        Reativação (aprovar envio)
      </h2>
      <p className="mt-1 text-sm text-[var(--bn-muted)]">
        Só quem já falou no WhatsApp (opt-in). Cliente responde PARE para sair.
        Teto {data?.usedThisMonth ?? 0}/{data?.monthlyCap ?? 30} neste mês.
      </p>
      {data && !data.templateConfigured ? (
        <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Falta o template marketing na Meta e a variável{" "}
          <code className="text-xs">META_WA_TEMPLATE_WINBACK</code>.
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-[var(--bn-status-danger)]">{error}</p>
      ) : null}
      <ul className="mt-4 divide-y divide-[var(--bn-border)]">
        {(data?.candidates ?? []).length === 0 ? (
          <li className="py-3 text-sm text-[var(--bn-muted)]">
            Ninguém na fila agora (precisa de ≥3 cortes, atraso vs o intervalo
            usual e opt-in).
          </li>
        ) : (
          (data?.candidates ?? []).map((c) => (
            <li
              key={c.phoneKey}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
            >
              <div>
                <p className="text-sm font-medium text-[var(--bn-on)]">
                  {c.displayName ?? c.phoneKey}
                </p>
                <p className="text-xs text-[var(--bn-muted)]">
                  {c.daysSinceLast}d sem corte · costuma {c.usualGapDays}d ·{" "}
                  {c.visitCount} visitas
                </p>
              </div>
              <button
                type="button"
                disabled={sending === c.phoneKey || !data?.templateConfigured}
                onClick={() => void sendOne(c.phoneKey)}
                className="rounded-xl bg-[var(--bn-primary)] px-3 py-2 text-xs font-semibold text-zinc-950 disabled:opacity-50"
              >
                {sending === c.phoneKey ? "Enviando…" : "Aprovar e enviar"}
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

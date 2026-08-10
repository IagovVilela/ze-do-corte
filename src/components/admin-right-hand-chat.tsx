"use client";

import { LoaderCircle, Send } from "lucide-react";
import { useState, type FormEvent } from "react";

import type { DashboardRange } from "@/lib/dashboard-period";

type Turn = { role: "user" | "assistant"; content: string };

type Props = {
  chartRange: DashboardRange;
};

export function AdminRightHandChat({ chartRange }: Props) {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);

  async function ask(e: FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (q.length < 3 || busy) return;
    setBusy(true);
    setError(null);
    const nextHistory = [...turns, { role: "user" as const, content: q }];
    setTurns(nextHistory);
    setQuestion("");
    try {
      const res = await fetch("/api/admin/ai/right-hand-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          chartRange,
          history: turns.slice(-6),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        message?: string;
        answer?: string;
      } | null;
      if (!res.ok || !data?.answer) {
        throw new Error(data?.message ?? "Não foi possível responder.");
      }
      setTurns([...nextHistory, { role: "assistant", content: data.answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no chat.");
      setTurns(turns);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface)] p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-[var(--bn-on)]">
        Pergunte ao Braço Direito
      </h3>
      <p className="mt-1 text-xs text-[var(--bn-muted)]">
        Ex.: &quot;por que minha receita caiu?&quot; ou &quot;quem reativar
        primeiro?&quot;
      </p>

      {turns.length > 0 ? (
        <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">
          {turns.map((t, i) => (
            <li
              key={`${t.role}-${i}`}
              className={
                t.role === "user"
                  ? "rounded-lg bg-[var(--bn-primary)]/15 px-3 py-2 text-sm text-[var(--bn-on)]"
                  : "rounded-lg border border-[var(--bn-border)] px-3 py-2 text-sm text-[var(--bn-on-variant)]"
              }
            >
              <span className="text-[10px] font-bold tracking-wide text-[var(--bn-muted)] uppercase">
                {t.role === "user" ? "Você" : "Consultor"}
              </span>
              <p className="mt-0.5 whitespace-pre-wrap">{t.content}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs text-[var(--bn-status-danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <form onSubmit={(e) => void ask(e)} className="mt-3 flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Digite sua pergunta…"
          disabled={busy}
          className="min-h-10 flex-1 rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-elevated)] px-3 text-sm text-[var(--bn-on)] outline-none focus:border-[var(--bn-primary)]"
        />
        <button
          type="submit"
          disabled={busy || question.trim().length < 3}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[var(--bn-primary)] px-3 text-xs font-semibold text-zinc-950 disabled:opacity-50"
        >
          {busy ? (
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Send className="size-3.5" aria-hidden />
          )}
          Enviar
        </button>
      </form>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { LoaderCircle } from "lucide-react";

import {
  formatBrMoneyFromNumber,
  formatBrMoneyInput,
  formatIntegerDigits,
  parseBrMoneyInput,
} from "@/lib/br-input-masks";
import { formatMoney } from "@/lib/utils";

type GoalRow = {
  staffMemberId: string;
  professionalName: string;
  revenueGoal: number | null;
  visitGoal: number | null;
  revenue: number;
  visits: number;
  revenueProgress: number | null;
  visitProgress: number | null;
};

export function AdminGoalsPanel() {
  const [yearMonth, setYearMonth] = useState(format(new Date(), "yyyy-MM"));
  const [rows, setRows] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { revenue: string; visits: string }>
  >({});

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/goals?yearMonth=${encodeURIComponent(yearMonth)}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        setRows([]);
        return;
      }
      const data = (await res.json()) as { rows: GoalRow[] };
      setRows(data.rows);
      const next: Record<string, { revenue: string; visits: string }> = {};
      for (const r of data.rows) {
        next[r.staffMemberId] = {
          revenue:
            r.revenueGoal != null
              ? formatBrMoneyFromNumber(r.revenueGoal)
              : "",
          visits: r.visitGoal != null ? String(r.visitGoal) : "",
        };
      }
      setDrafts(next);
    } finally {
      setLoading(false);
    }
  }, [yearMonth]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(staffMemberId: string) {
    const draft = drafts[staffMemberId];
    if (!draft) return;
    const revenueGoal = parseBrMoneyInput(draft.revenue);
    if (!Number.isFinite(revenueGoal) || revenueGoal < 0) {
      setMessage("Informe uma meta de faturamento válida.");
      return;
    }
    setSavingId(staffMemberId);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yearMonth,
          staffMemberId,
          revenueGoal,
          visitGoal: draft.visits ? Number(draft.visits) : null,
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setMessage(data.message ?? "Falha ao salvar meta.");
        return;
      }
      setMessage("Meta salva.");
      await load();
    } finally {
      setSavingId(null);
    }
  }

  const field =
    "min-h-10 w-full rounded-xl border border-[var(--bn-outline)] bg-[var(--bn-surface)] px-3 py-2 text-sm text-[var(--bn-on)]";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--bn-on-variant)]">Mês</span>
          <input
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            className={field}
          />
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl bg-[var(--bn-primary)] px-4 py-2.5 text-sm font-semibold text-zinc-950"
        >
          Atualizar
        </button>
      </div>

      {message ? (
        <p className="rounded-xl border border-[var(--bn-status-info)]/35 bg-[var(--bn-status-info)]/10 px-4 py-3 text-sm text-[var(--bn-status-info)]">
          {message}
        </p>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <LoaderCircle className="size-6 animate-spin text-[var(--bn-primary)]" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[var(--bn-muted)]">
          Nenhum profissional (STAFF) cadastrado.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const draft = drafts[r.staffMemberId] ?? {
              revenue: "",
              visits: "",
            };
            return (
              <li
                key={r.staffMemberId}
                className="rounded-2xl border border-[var(--bn-outline)] bg-[var(--bn-surface-elevated)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-[var(--bn-on)]">
                      {r.professionalName}
                    </p>
                    <p className="mt-1 text-xs text-[var(--bn-on-variant)]">
                      Realizado: {formatMoney(r.revenue)} · {r.visits} visita(s)
                      {r.revenueProgress != null
                        ? ` · ${r.revenueProgress}% da meta`
                        : ""}
                    </p>
                  </div>
                  {r.revenueProgress != null ? (
                    <div className="h-2 w-28 overflow-hidden rounded-full bg-[var(--bn-surface)]">
                      <div
                        className="h-full rounded-full bg-[var(--bn-primary)]"
                        style={{
                          width: `${Math.min(100, Math.max(0, r.revenueProgress))}%`,
                        }}
                      />
                    </div>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <label className="block space-y-1">
                    <span className="text-xs text-[var(--bn-muted)]">
                      Meta faturamento (R$)
                    </span>
                    <input
                      inputMode="decimal"
                      className={field}
                      value={draft.revenue}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [r.staffMemberId]: {
                            ...draft,
                            revenue: formatBrMoneyInput(e.target.value),
                          },
                        }))
                      }
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-[var(--bn-muted)]">
                      Meta visitas (opc.)
                    </span>
                    <input
                      inputMode="numeric"
                      className={field}
                      value={draft.visits}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [r.staffMemberId]: {
                            ...draft,
                            visits: formatIntegerDigits(e.target.value, 4),
                          },
                        }))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    disabled={savingId === r.staffMemberId}
                    onClick={() => void save(r.staffMemberId)}
                    className="self-end rounded-xl border border-[var(--bn-primary)]/35 px-4 py-2.5 text-sm font-semibold text-[var(--bn-primary)] disabled:opacity-60"
                  >
                    {savingId === r.staffMemberId ? "…" : "Salvar"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

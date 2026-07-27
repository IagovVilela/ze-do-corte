"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { LoaderCircle } from "lucide-react";

import {
  AdminFinanceUnitFilter,
  type FinanceUnitOption,
} from "@/components/admin-finance-unit-filter";
import { formatMoney } from "@/lib/utils";

type Entry = {
  id: string;
  description: string;
  netAmount: number;
  status: string;
  dueDate: string;
  paidAt: string | null;
  categoryName: string | null;
  unitName: string | null;
  paymentMethod: string | null;
};

type Props = {
  kind: "EXPENSE" | "INCOME";
  status?: "OPEN" | "PAID";
  createHref: string;
  createLabel: string;
  units: FinanceUnitOption[];
};

function statusLabel(status: string) {
  if (status === "OPEN") return "Em aberto";
  if (status === "PAID") return "Pago";
  return status;
}

export function AdminFinanceEntriesList({
  kind,
  status = "OPEN",
  createHref,
  createLabel,
  units,
}: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [unitId, setUnitId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ kind, status });
      if (unitId) qs.set("unitId", unitId);
      const res = await fetch(`/api/admin/finance/entries?${qs}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setEntries([]);
        return;
      }
      const data = (await res.json()) as { entries?: Entry[] };
      setEntries(data.entries ?? []);
    } finally {
      setLoading(false);
    }
  }, [kind, status, unitId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(id: string, action: "mark_paid" | "cancel") {
    setBusyId(id);
    try {
      await fetch(`/api/admin/finance/entries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  function EntryActions({ entry }: { entry: Entry }) {
    return (
      <div className="flex flex-wrap gap-2">
        {entry.status === "OPEN" ? (
          <button
            type="button"
            disabled={busyId === entry.id}
            onClick={() => void patch(entry.id, "mark_paid")}
            className="min-h-10 flex-1 rounded-lg bg-[var(--bn-primary)] px-3 py-2 text-xs font-semibold text-zinc-950 transition hover:opacity-90 sm:min-h-0 sm:flex-none sm:px-2.5 sm:py-1"
          >
            Quitar
          </button>
        ) : null}
        {entry.status !== "CANCELLED" ? (
          <button
            type="button"
            disabled={busyId === entry.id}
            onClick={() => void patch(entry.id, "cancel")}
            className="min-h-10 flex-1 rounded-lg border border-[var(--bn-border)] px-3 py-2 text-xs font-semibold text-[var(--bn-on-variant)] transition hover:bg-[var(--bn-hover)] hover:text-[var(--bn-on)] sm:min-h-0 sm:flex-none sm:px-2.5 sm:py-1"
          >
            Cancelar
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-end">
          <p className="text-sm text-[var(--bn-on-variant)] sm:pb-2">
            {status === "OPEN"
              ? kind === "EXPENSE"
                ? "Despesas em aberto (a pagar)."
                : "Receitas em aberto (a receber)."
              : "Lançamentos quitados."}
          </p>
          <AdminFinanceUnitFilter
            units={units}
            value={unitId}
            onChange={setUnitId}
            className="w-full sm:w-auto [&_select]:w-full sm:[&_select]:w-auto"
          />
        </div>
        <Link
          href={createHref}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--bn-primary)] px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:opacity-90 sm:min-h-0 sm:w-auto"
        >
          {createLabel}
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoaderCircle className="size-6 animate-spin text-[var(--bn-primary)]" />
        </div>
      ) : entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--bn-outline)] px-4 py-10 text-center text-sm text-[var(--bn-on-variant)]">
          Nenhum lançamento neste filtro.
        </p>
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {entries.map((e) => (
              <li
                key={e.id}
                className="rounded-2xl border border-[var(--bn-outline)] bg-[var(--bn-surface-elevated)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium break-words text-[var(--bn-on)]">
                      {e.description}
                    </p>
                    <p className="mt-1 text-xs text-[var(--bn-on-variant)]">
                      {[e.categoryName, e.unitName, e.paymentMethod]
                        .filter(Boolean)
                        .join(" · ") || "Sem categoria"}
                    </p>
                  </div>
                  <p className="shrink-0 text-base font-bold tabular-nums text-[var(--bn-on)]">
                    {formatMoney(e.netAmount)}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--bn-on-variant)]">
                  <span>
                    Venc. {format(parseISO(e.dueDate), "dd/MM/yyyy")}
                  </span>
                  <span>{statusLabel(e.status)}</span>
                </div>
                <div className="mt-3">
                  <EntryActions entry={e} />
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-2xl border border-[var(--bn-outline)] md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--bn-surface-elevated)] text-[11px] tracking-wide text-[var(--bn-on-variant)] uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Descrição</th>
                  <th className="px-4 py-3 font-semibold">Vencimento</th>
                  <th className="px-4 py-3 font-semibold">Valor</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr
                    key={e.id}
                    className="border-t border-[var(--bn-outline)] text-[var(--bn-on)]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{e.description}</p>
                      <p className="text-xs text-[var(--bn-on-variant)]">
                        {[e.categoryName, e.unitName, e.paymentMethod]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {format(parseISO(e.dueDate), "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums">
                      {formatMoney(e.netAmount)}
                    </td>
                    <td className="px-4 py-3">{statusLabel(e.status)}</td>
                    <td className="px-4 py-3">
                      <EntryActions entry={e} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

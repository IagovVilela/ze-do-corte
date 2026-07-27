"use client";

import { useCallback, useEffect, useState } from "react";
import { format, subDays } from "date-fns";
import { LoaderCircle } from "lucide-react";

import {
  AdminFinanceUnitFilter,
  type FinanceUnitOption,
} from "@/components/admin-finance-unit-filter";
import { formatMoney } from "@/lib/utils";

type Balance = {
  manualIncomePaid: number;
  manualIncomeOpen: number;
  manualExpensePaid: number;
  manualExpenseOpen: number;
  caixaServices: number;
  caixaProducts: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  projectedBalance: number;
};

type Props = {
  units: FinanceUnitOption[];
};

export function AdminFinanceBalancePanel({ units }: Props) {
  const [from, setFrom] = useState(
    format(subDays(new Date(), 29), "yyyy-MM-dd"),
  );
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [unitId, setUnitId] = useState("");
  const [data, setData] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ from, to });
      if (unitId) qs.set("unitId", unitId);
      const res = await fetch(`/api/admin/finance/balance?${qs}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setData(null);
        return;
      }
      setData((await res.json()) as Balance);
    } finally {
      setLoading(false);
    }
  }, [from, to, unitId]);

  useEffect(() => {
    void load();
  }, [load]);

  const field =
    "min-h-11 w-full rounded-xl border border-[var(--bn-outline)] bg-[var(--bn-surface)] px-3 py-2 text-sm text-[var(--bn-on)] sm:min-h-0 sm:w-auto";

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--bn-on-variant)]">Data inicial</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--bn-on-variant)]">Data final</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={field}
          />
        </label>
        <AdminFinanceUnitFilter
          units={units}
          value={unitId}
          onChange={setUnitId}
        />
        <button
          type="button"
          onClick={() => void load()}
          className="min-h-11 w-full rounded-xl bg-[var(--bn-primary)] px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:opacity-90 sm:min-h-0 sm:w-auto sm:py-2"
        >
          Filtrar
        </button>
      </div>

      {loading || !data ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="size-6 animate-spin text-[var(--bn-primary)]" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          <Stat
            label="Receitas (caixa + manuais)"
            value={formatMoney(data.totalIncome)}
            hint={`Serviços ${formatMoney(data.caixaServices)} · Produtos ${formatMoney(data.caixaProducts)} · Manuais ${formatMoney(data.manualIncomePaid)}`}
          />
          <Stat
            label="Despesas pagas"
            value={formatMoney(data.totalExpense)}
            hint={`Em aberto ${formatMoney(data.manualExpenseOpen)}`}
          />
          <Stat
            label="Saldo do período"
            value={formatMoney(data.balance)}
            hint={`Projetado (com abertos): ${formatMoney(data.projectedBalance)}`}
            emphasize
          />
          <Stat
            label="A receber"
            value={formatMoney(data.manualIncomeOpen)}
          />
          <Stat
            label="A pagar"
            value={formatMoney(data.manualExpenseOpen)}
          />
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  emphasize,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={
        emphasize
          ? "rounded-2xl border border-[var(--bn-primary)]/40 bg-[var(--bn-primary)]/10 p-5"
          : "rounded-2xl border border-[var(--bn-outline)] bg-[var(--bn-surface-elevated)] p-5"
      }
    >
      <p className="text-xs font-semibold tracking-wide text-[var(--bn-on-variant)] uppercase">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold break-all tabular-nums text-[var(--bn-on)] sm:text-2xl">
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-xs leading-relaxed break-words text-[var(--bn-on-variant)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

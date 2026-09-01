"use client";

import { useCallback, useEffect, useState } from "react";
import { format, subDays } from "date-fns";
import { LoaderCircle } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  AdminFinanceUnitFilter,
  type FinanceUnitOption,
} from "@/components/admin-finance-unit-filter";
import { formatMoney } from "@/lib/utils";

type Bucket = {
  date: string;
  label: string;
  inflow: number;
  outflow: number;
  net: number;
  runningBalance: number;
  isProjected: boolean;
};

type CashFlowData = {
  totalInflow: number;
  totalOutflow: number;
  closingBalance: number;
  buckets: Bucket[];
  byCategory: {
    categoryId: string | null;
    categoryName: string;
    inflow: number;
    outflow: number;
  }[];
};

type Props = {
  units: FinanceUnitOption[];
};

export function FinanceCashflowPanel({ units }: Props) {
  const [from, setFrom] = useState(format(subDays(new Date(), 29), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [unitId, setUnitId] = useState("");
  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ from, to });
      if (unitId) qs.set("unitId", unitId);
      const res = await fetch(`/api/admin/finance/cashflow?${qs}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      setData((await res.json()) as CashFlowData);
    } finally {
      setLoading(false);
    }
  }, [from, to, unitId]);

  useEffect(() => {
    void load();
  }, [load]);

  const chartData =
    data?.buckets.map((b) => ({
      label: b.label,
      saldo: b.runningBalance,
      projected: b.isProjected,
    })) ?? [];

  const field =
    "min-h-11 w-full rounded-xl border border-[var(--bn-outline)] bg-[var(--bn-surface)] px-3 py-2 text-sm sm:min-h-0 sm:w-auto";

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--bn-on-variant)]">De</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--bn-on-variant)]">Até</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={field} />
        </label>
        <AdminFinanceUnitFilter units={units} value={unitId} onChange={setUnitId} />
        <button
          type="button"
          onClick={() => void load()}
          className="min-h-11 rounded-xl bg-[var(--bn-primary)] px-4 py-2.5 text-sm font-semibold text-zinc-950 sm:min-h-0"
        >
          Atualizar
        </button>
      </div>

      {loading || !data ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="h-8 w-8 animate-spin text-[var(--bn-primary)]" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard label="Entradas" value={formatMoney(data.totalInflow)} />
            <SummaryCard label="Saídas" value={formatMoney(data.totalOutflow)} />
            <SummaryCard label="Saldo final" value={formatMoney(data.closingBalance)} />
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bn-outline)" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="saldo"
                  name="Saldo acumulado"
                  stroke="var(--bn-primary)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[var(--bn-outline)]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--bn-outline)] bg-[var(--bn-surface)]">
                  <th className="px-3 py-2 text-left">Dia</th>
                  <th className="px-3 py-2 text-right">Entrada</th>
                  <th className="px-3 py-2 text-right">Saída</th>
                  <th className="px-3 py-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {data.buckets
                  .filter((b) => b.inflow > 0 || b.outflow > 0)
                  .slice(-14)
                  .map((b) => (
                    <tr
                      key={b.date}
                      className={`border-b border-[var(--bn-outline)]/50 ${
                        b.isProjected ? "opacity-70 italic" : ""
                      }`}
                    >
                      <td className="px-3 py-2">{b.label}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatMoney(b.inflow)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatMoney(b.outflow)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">
                        {formatMoney(b.runningBalance)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-[var(--bn-on)]">Por categoria</h3>
            <div className="space-y-1 text-sm">
              {data.byCategory.map((c) => (
                <div
                  key={c.categoryId ?? `name:${c.categoryName}`}
                  className="flex justify-between rounded-lg border border-[var(--bn-outline)]/60 px-3 py-2"
                >
                  <span>{c.categoryName}</span>
                  <span className="tabular-nums text-[var(--bn-on-variant)]">
                    +{formatMoney(c.inflow)} / −{formatMoney(c.outflow)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--bn-outline)] bg-[var(--bn-surface)] p-4">
      <p className="text-xs text-[var(--bn-on-variant)]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[var(--bn-on)]">{value}</p>
    </div>
  );
}

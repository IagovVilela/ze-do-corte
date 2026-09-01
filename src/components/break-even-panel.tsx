"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
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

import { formatMoney } from "@/lib/utils";

type BreakEvenData = {
  yearMonth: string;
  fixedCostsTotal: number;
  proLabore: number;
  breakEvenUnits: number;
  breakEvenRevenue: number;
  actualUnits: number;
  actualRevenue: number;
  progressPercent: number;
  averageTicket: number;
  averageContributionMargin: number;
};

export function BreakEvenPanel() {
  const [yearMonth, setYearMonth] = useState(format(new Date(), "yyyy-MM"));
  const [data, setData] = useState<BreakEvenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [priceAdjust, setPriceAdjust] = useState(0);
  const [productiveHours, setProductiveHours] = useState(156);
  const [simulation, setSimulation] = useState<{
    breakEvenUnits: number;
    breakEvenRevenue: number;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/finance/break-even?yearMonth=${yearMonth}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      setData((await res.json()) as BreakEvenData);
    } finally {
      setLoading(false);
    }
  }, [yearMonth]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runSimulation() {
    const qs = new URLSearchParams({
      simulate: "1",
      yearMonth,
      priceAdjustPercent: String(priceAdjust),
      productiveHours: String(productiveHours),
    });
    const res = await fetch(`/api/admin/finance/break-even?${qs}`);
    if (res.ok) {
      setSimulation(await res.json());
    }
  }

  const chartData = data
    ? [
        { name: "Fixos + pró-labore", value: data.fixedCostsTotal },
        { name: "Realizado", value: data.actualRevenue },
        { name: "PE (faturamento)", value: data.breakEvenRevenue },
      ]
    : [];

  return (
    <div className="space-y-6">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-[var(--bn-on-variant)]">Mês de referência</span>
        <input
          type="month"
          value={yearMonth}
          onChange={(e) => setYearMonth(e.target.value)}
          className="min-h-11 w-full max-w-xs rounded-xl border border-[var(--bn-outline)] bg-[var(--bn-surface)] px-3 py-2 text-sm"
        />
      </label>

      {loading || !data ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="h-8 w-8 animate-spin text-[var(--bn-primary)]" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card label="Ponto de equilíbrio" value={`${data.breakEvenUnits} atend.`} />
            <Card label="Faturamento PE" value={formatMoney(data.breakEvenRevenue)} />
            <Card label="Realizado no mês" value={`${data.actualUnits} atend.`} />
            <Card
              label="Progresso"
              value={`${data.progressPercent}%`}
              highlight={data.progressPercent >= 100}
            />
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <Stat label="Ticket médio" value={formatMoney(data.averageTicket)} />
            <Stat
              label="Margem contrib. média"
              value={formatMoney(data.averageContributionMargin)}
            />
            <Stat label="Pró-labore" value={formatMoney(data.proLabore)} />
          </div>

          <div className="rounded-2xl border border-[var(--bn-outline)] bg-[var(--bn-surface)] p-4">
            <h3 className="text-sm font-semibold text-[var(--bn-on)]">Simulador</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-xs">
                Ajuste de preço (%)
                <input
                  type="number"
                  value={priceAdjust}
                  onChange={(e) => setPriceAdjust(Number(e.target.value))}
                  className="rounded-lg border border-[var(--bn-outline)] px-2 py-1.5 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                Horas produtivas
                <input
                  type="number"
                  value={productiveHours}
                  onChange={(e) => setProductiveHours(Number(e.target.value))}
                  className="rounded-lg border border-[var(--bn-outline)] px-2 py-1.5 text-sm"
                />
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => void runSimulation()}
                  className="w-full rounded-xl bg-[var(--bn-primary)] px-4 py-2 text-sm font-semibold text-zinc-950"
                >
                  Simular
                </button>
              </div>
            </div>
            {simulation ? (
              <p className="mt-3 text-sm text-[var(--bn-on-variant)]">
                Com simulação: PE = {simulation.breakEvenUnits} atendimentos (
                {formatMoney(simulation.breakEvenRevenue)})
              </p>
            ) : null}
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bn-outline)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--bn-primary)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

function Card({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[var(--bn-outline)] bg-[var(--bn-surface)] p-4">
      <p className="text-xs text-[var(--bn-on-variant)]">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold ${
          highlight ? "text-[var(--bn-primary)]" : "text-[var(--bn-on)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--bn-outline)] px-3 py-2">
      <p className="text-xs text-[var(--bn-on-variant)]">{label}</p>
      <p className="font-medium text-[var(--bn-on)]">{value}</p>
    </div>
  );
}

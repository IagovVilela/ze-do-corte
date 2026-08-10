"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAdminChartColors } from "@/components/admin-theme-provider";
import type { RightHandCompareMetric } from "@/lib/admin-right-hand-types";
import {
  formatDeltaPercent,
  formatDeltaPoints,
} from "@/lib/right-hand-metrics";

type Props = {
  metrics: RightHandCompareMetric[];
  currentLabel: string;
  previousLabel: string;
  showDelta: boolean;
};

function formatValue(m: RightHandCompareMetric, n: number): string {
  switch (m.format) {
    case "money":
      return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    case "percent":
      return `${n}%`;
    case "number":
      return String(Math.round(n));
    default: {
      const _n: never = m.format;
      return _n;
    }
  }
}

export function AdminRightHandCompareBars({
  metrics,
  currentLabel,
  previousLabel,
  showDelta,
}: Props) {
  const chart = useAdminChartColors();
  // Só métricas comparáveis no mesmo eixo (sem misturar % de cancelamento com R$).
  const chartMetrics = metrics.filter((m) => m.key !== "cancelRate");
  const data = chartMetrics.map((m) => ({
    name: m.label,
    atual: m.current,
    anterior: m.previous,
    format: m.format,
  }));

  if (metrics.every((m) => m.current === 0 && m.previous === 0)) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--bn-border)] bg-[var(--bn-surface)] p-6 text-sm text-[var(--bn-muted)]">
        Sem dados para comparar neste período.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface)] p-5">
      <h3 className="text-sm font-semibold text-[var(--bn-on)]">
        Comparativo vs período anterior
      </h3>
      <p className="mt-1 text-xs text-[var(--bn-muted)]">
        {currentLabel} · vs {previousLabel}
      </p>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
            <XAxis
              dataKey="name"
              tick={{ fill: chart.tick, fontSize: 11 }}
              tickLine={false}
            />
            <YAxis tick={{ fill: chart.tick, fontSize: 11 }} tickLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: "0.75rem",
                border: chart.tooltipBorder,
                background: chart.tooltipBg,
                color: chart.tooltipColor,
              }}
              formatter={(value, name, item) => {
                const row = item?.payload as {
                  format: RightHandCompareMetric["format"];
                };
                const n = typeof value === "number" ? value : Number(value);
                const label = name === "atual" ? "Atual" : "Anterior";
                const fake: RightHandCompareMetric = {
                  key: "revenue",
                  label: "",
                  current: 0,
                  previous: 0,
                  deltaPercent: null,
                  deltaMode: "percent",
                  format: row?.format ?? "number",
                };
                return [formatValue(fake, n), label];
              }}
            />
            <Legend />
            <Bar
              dataKey="atual"
              name="Atual"
              fill="var(--bn-primary)"
              radius={[6, 6, 0, 0]}
            />
            <Bar
              dataKey="anterior"
              name="Anterior"
              fill="#64748b"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {showDelta ? (
        <ul className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--bn-muted)]">
          {metrics.map((m) => (
            <li key={m.key}>
              {m.label}:{" "}
              <span className="font-medium text-[var(--bn-on)]">
                {m.deltaMode === "points"
                  ? formatDeltaPoints(m.deltaPercent)
                  : formatDeltaPercent(m.deltaPercent)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-[var(--bn-muted)]">
          Comparativo percentual oculto enquanto o histórico ainda é curto.
        </p>
      )}
    </div>
  );
}

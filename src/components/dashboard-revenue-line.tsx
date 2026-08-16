"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AdminRightHandChartShell } from "@/components/admin-right-hand-chart-shell";
import { useAdminChartColors } from "@/components/admin-theme-provider";
import type { RightHandCompareMetric } from "@/lib/admin-right-hand-types";
import type { ConfidenceLevel } from "@/lib/right-hand-confidence";
import {
  formatDeltaPercent,
  formatDeltaPoints,
} from "@/lib/right-hand-metrics";
import type { DashboardRevenuePoint } from "@/lib/types";
import { findPeakValley } from "@/lib/right-hand-metrics";

type Props = {
  data: DashboardRevenuePoint[];
  periodLabel: string;
  previousPeriodLabel?: string;
  peakIndex?: number | null;
  valleyIndex?: number | null;
  compact?: boolean;
  confidence?: ConfidenceLevel;
  /** Deltas vs período anterior (substitui o comparativo em barras). */
  compareMetrics?: RightHandCompareMetric[];
};

function deltaChip(m: RightHandCompareMetric): string {
  if (
    m.deltaReason === "no_baseline" ||
    m.deltaReason === "insufficient_maturity" ||
    m.deltaPercent == null
  ) {
    return "sem base de comparação ainda";
  }
  return m.deltaMode === "points"
    ? formatDeltaPoints(m.deltaPercent)
    : formatDeltaPercent(m.deltaPercent);
}

function formatMetricValue(m: RightHandCompareMetric): string {
  switch (m.format) {
    case "money":
      return m.current.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
    case "percent":
      return `${m.current}%`;
    case "number":
      return String(Math.round(m.current));
    default: {
      const _n: never = m.format;
      return _n;
    }
  }
}

export function DashboardRevenueLine({
  data,
  periodLabel,
  previousPeriodLabel,
  peakIndex: peakProp,
  valleyIndex: valleyProp,
  compact = false,
  confidence = "conclusive",
  compareMetrics,
}: Props) {
  const chart = useAdminChartColors();
  const maxAmt = Math.max(...data.map((d) => d.amount), 1);
  const hasAny = data.some((d) => d.amount > 0);
  const computed = findPeakValley(data.map((d) => d.amount));
  const peakIndex = peakProp ?? computed.peakIndex;
  const valleyIndex = valleyProp ?? computed.valleyIndex;
  const peak = peakIndex != null ? data[peakIndex] : null;
  const valley =
    valleyIndex != null && valleyIndex !== peakIndex ? data[valleyIndex] : null;

  const highlightKeys = new Set(["revenue", "appointments", "avgTicket"]);
  const chips = (compareMetrics ?? []).filter((m) => highlightKeys.has(m.key));

  const chartBody = (
    <div className={compact ? "h-40" : "h-56"}>
      {hasAny ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
            <XAxis
              dataKey="dateLabel"
              tick={{ fill: chart.tick, fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: chart.tick, fontSize: 10 }}
              width={44}
              domain={[0, Math.ceil(maxAmt * 1.1)]}
              tickFormatter={(v) => `R$${v}`}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "0.75rem",
                border: chart.tooltipBorder,
                background: chart.tooltipBg,
                color: chart.tooltipColor,
              }}
              labelStyle={{ color: chart.tooltipColor }}
              itemStyle={{ color: chart.tooltipColor }}
              formatter={(value) => [
                `R$ ${Number(value ?? 0).toFixed(2)}`,
                "Recebido",
              ]}
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke={chart.info}
              strokeWidth={2.5}
              dot={{ fill: chart.info, r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
            {peak ? (
              <ReferenceDot
                x={peak.dateLabel}
                y={peak.amount}
                r={6}
                fill={chart.peak}
                stroke={chart.peak}
              />
            ) : null}
            {valley ? (
              <ReferenceDot
                x={valley.dateLabel}
                y={valley.amount}
                r={6}
                fill={chart.valley}
                stroke={chart.valley}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-[var(--bn-border)] bg-[var(--bn-hover)] text-sm text-[var(--bn-muted)]">
          Sem pagamentos registrados neste intervalo.
        </div>
      )}
    </div>
  );

  if (compact) return chartBody;

  return (
    <AdminRightHandChartShell
      id="tendencia"
      title="Tendência de receita"
      subtitle={
        peak
          ? `Pico ${peak.dateLabel} · ${periodLabel}`
          : `Crescendo ou caindo · ${periodLabel}`
      }
      confidence={confidence}
    >
      {chartBody}
      {chips.length > 0 ? (
        <ul className="mt-4 grid gap-2 sm:grid-cols-3">
          {chips.map((m) => (
            <li
              key={m.key}
              className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-3 py-2"
            >
              <p className="text-[10px] font-semibold tracking-wide text-[var(--bn-muted)] uppercase">
                {m.label}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[var(--bn-on)]">
                {formatMetricValue(m)}
              </p>
              <p className="text-[11px] text-[var(--bn-muted)]">
                vs {previousPeriodLabel ?? "anterior"}: {deltaChip(m)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </AdminRightHandChartShell>
  );
}

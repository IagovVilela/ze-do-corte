"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAdminChartColors } from "@/components/admin-theme-provider";
import type { DashboardServiceBar } from "@/lib/types";

const BAR_COLORS = [
  "#a855f7",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
  "#14b8a6",
  "#3b82f6",
  "#ef4444",
  "#8b5cf6",
];

type Props = {
  data: DashboardServiceBar[];
  periodLabel: string;
};

export function DashboardServicesBarChart({ data, periodLabel }: Props) {
  const chart = useAdminChartColors();
  const chartHeight = Math.max(220, Math.min(420, data.length * 42 + 72));

  return (
    <div className="glass-card rounded-2xl border border-fuchsia-500/10 p-5">
      <h3 className="font-display text-xl font-normal uppercase tracking-wide text-[var(--bn-primary)]">
        Ranking de serviços
      </h3>
      <p className="mt-1 text-sm text-[var(--bn-muted)]">
        Quantidade no período:{" "}
        <span className="text-[var(--bn-on-variant)]">{periodLabel}</span>
      </p>
      <div className="mt-5" style={{ height: data.length ? chartHeight : 200 }}>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={chart.grid}
                horizontal={false}
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fill: chart.tick, fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tick={{ fill: chart.tick, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: chart.grid }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: chart.tooltipBorder,
                  background: chart.tooltipBg,
                  color: chart.tooltipColor,
                }}
                formatter={(value) => [`${value ?? 0} agend.`, "Total"]}
              />
              <Bar dataKey="count" radius={[0, 8, 8, 0]} maxBarSize={24}>
                {data.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full min-h-[200px] items-center justify-center rounded-xl border border-dashed border-[var(--bn-border)] bg-[var(--bn-hover)] text-sm text-[var(--bn-muted)]">
            Sem agendamentos por serviço neste período (por data de início). Experimente outro
            intervalo nas abas acima.
          </div>
        )}
      </div>
    </div>
  );
}

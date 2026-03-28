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

import type { DashboardServiceBar } from "@/lib/types";

const BAR_COLORS = [
  "#a855f7",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
  "#14b8a6",
  "#eab308",
  "#ef4444",
  "#8b5cf6",
];

type Props = {
  data: DashboardServiceBar[];
  periodLabel: string;
};

export function DashboardServicesBarChart({ data, periodLabel }: Props) {
  const chartHeight = Math.max(220, Math.min(420, data.length * 42 + 72));

  return (
    <div className="glass-card rounded-2xl border border-fuchsia-500/10 p-5">
      <h3 className="font-display text-xl font-normal uppercase tracking-wide text-fuchsia-200/90">
        Ranking de serviços
      </h3>
      <p className="mt-1 text-sm text-zinc-400">
        Quantidade no período: <span className="text-zinc-300">{periodLabel}</span>
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
                stroke="rgba(255,255,255,0.08)"
                horizontal={false}
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fill: "#a1a1aa", fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tick={{ fill: "#d4d4d8", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "#11131a",
                }}
                labelStyle={{ color: "#f4f4f5" }}
                formatter={(value) => [
                  `${value ?? 0} agend.`,
                  "Total",
                ]}
              />
              <Bar dataKey="count" radius={[0, 8, 8, 0]} maxBarSize={24}>
                {data.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full min-h-[200px] items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-sm text-zinc-500">
            Sem agendamentos por serviço neste período (por data de início). Experimente outro
            intervalo nas abas acima.
          </div>
        )}
      </div>
    </div>
  );
}

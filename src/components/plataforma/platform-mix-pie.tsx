"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import type { DashboardStatusSlice } from "@/lib/types";

type Props = {
  data: DashboardStatusSlice[];
  title: string;
  subtitle: string;
  emptyLabel?: string;
  centerLabel?: string;
};

export function PlatformMixPie({
  data,
  title,
  subtitle,
  emptyLabel = "Sem dados ainda.",
  centerLabel = "total",
}: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const hasData = total > 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="text-lg font-medium tracking-tight text-white">{title}</h3>
      <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
      <div className="relative mt-4 h-72">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="48%"
                innerRadius={58}
                outerRadius={92}
                paddingAngle={2.5}
                stroke="rgba(0,0,0,0.35)"
                strokeWidth={1}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <text
                x="50%"
                y="44%"
                textAnchor="middle"
                className="fill-zinc-50"
                style={{ fontSize: 26, fontWeight: 600 }}
              >
                {total}
              </text>
              <text
                x="50%"
                y="54%"
                textAnchor="middle"
                fill="#71717a"
                style={{ fontSize: 11 }}
              >
                {centerLabel}
              </text>
              <Tooltip
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "#11131a",
                }}
                formatter={(value, name) => {
                  const n = Number(value ?? 0);
                  return [
                    `${n} (${total ? Math.round((n / total) * 100) : 0}%)`,
                    String(name ?? ""),
                  ];
                }}
              />
              <Legend
                verticalAlign="bottom"
                formatter={(value) => (
                  <span className="text-sm text-zinc-300">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-sm text-zinc-500">
            {emptyLabel}
          </div>
        )}
      </div>
    </div>
  );
}

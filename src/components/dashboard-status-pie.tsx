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
  monthLabel: string;
};

export function DashboardStatusPie({ data, monthLabel }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const hasData = total > 0;

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="font-display text-xl font-normal uppercase tracking-wide text-white">
        Agendamentos por status
      </h3>
      <p className="mt-1 text-sm text-zinc-400">
        Distribuição no mês: <span className="text-zinc-300">{monthLabel}</span>
      </p>
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
                innerRadius={56}
                outerRadius={88}
                paddingAngle={2}
                stroke="rgba(0,0,0,0.25)"
                strokeWidth={1}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
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
            Nenhum agendamento neste mês no seu âmbito.
          </div>
        )}
      </div>
    </div>
  );
}

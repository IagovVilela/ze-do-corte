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
  periodLabel: string;
};

export function DashboardStatusPie({ data, periodLabel }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const hasData = total > 0;

  return (
    <div className="glass-card rounded-2xl border border-violet-500/10 p-5">
      <h3 className="font-display text-xl font-normal uppercase tracking-wide text-violet-200/90">
        Status dos agendamentos
      </h3>
      <p className="mt-1 text-sm text-zinc-400">
        Distribuição no período: <span className="text-zinc-300">{periodLabel}</span>
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
                agendamentos
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
            Nenhum agendamento com início neste período. Se só houver reservas futuras, abra{" "}
            <strong className="text-zinc-400">Mês</strong> ou <strong className="text-zinc-400">3 meses</strong>{" "}
            — a lista abaixo mostra todos os registos.
          </div>
        )}
      </div>
    </div>
  );
}

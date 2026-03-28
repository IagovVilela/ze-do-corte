"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardPoint } from "@/lib/types";

type DashboardChartProps = {
  data: DashboardPoint[];
};

export function DashboardChart({ data }: DashboardChartProps) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="font-display text-xl font-normal uppercase tracking-wide text-white">
        Volume diário
      </h3>
      <p className="mt-1 text-sm text-zinc-400">
        Agendamentos por dia — últimos 7 dias corridos.
      </p>
      <div className="mt-5 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
            <XAxis dataKey="dateLabel" tick={{ fill: "#d4d4d8", fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fill: "#d4d4d8", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                borderRadius: "0.75rem",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "#11131a",
              }}
              labelStyle={{ color: "#f4f4f5" }}
              cursor={{ fill: "rgba(245, 158, 11, 0.12)" }}
            />
            <Bar dataKey="count" fill="#f59e0b" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

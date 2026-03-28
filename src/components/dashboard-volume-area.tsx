"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DashboardPoint } from "@/lib/types";

type Props = {
  data: DashboardPoint[];
  title: string;
  subtitle: string;
};

export function DashboardVolumeArea({ data, title, subtitle }: Props) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="font-display text-xl font-normal uppercase tracking-wide text-white">
        {title}
      </h3>
      <p className="mt-1 text-sm text-zinc-400">
        <span className="text-zinc-300">{subtitle}</span>
      </p>
      <div className="mt-5 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="volArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis allowDecimals={false} tick={{ fill: "#a1a1aa", fontSize: 11 }} width={36} />
            <Tooltip
              contentStyle={{
                borderRadius: "0.75rem",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "#11131a",
              }}
              labelStyle={{ color: "#f4f4f5" }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#22d3ee"
              strokeWidth={2}
              fill="url(#volArea)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

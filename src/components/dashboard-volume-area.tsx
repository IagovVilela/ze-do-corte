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
  /** Singular/plural no tooltip (padrão: reserva/reservas). */
  unitSingular?: string;
  unitPlural?: string;
  stroke?: string;
  gradientId?: string;
};

function VolumeTooltip({
  active,
  payload,
  label,
  unitSingular,
  unitPlural,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: DashboardPoint }>;
  label?: string;
  unitSingular: string;
  unitPlural: string;
}) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0]?.value ?? 0);
  const day = payload[0]?.payload?.dateLabel ?? label;
  return (
    <div className="rounded-xl border border-white/20 bg-[#11131a] px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-zinc-100">{day}</p>
      <p className="mt-1 text-zinc-300">
        {value === 1 ? `1 ${unitSingular}` : `${value} ${unitPlural}`}
      </p>
    </div>
  );
}

export function DashboardVolumeArea({
  data,
  title,
  subtitle,
  unitSingular = "reserva",
  unitPlural = "reservas",
  stroke = "#3b82f6",
  gradientId = "volArea",
}: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="text-lg font-medium tracking-tight text-white">{title}</h3>
      <p className="mt-1 text-sm text-zinc-400">
        <span className="text-zinc-300">{subtitle}</span>
      </p>
      <div className="mt-5 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.45} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              width={36}
            />
            <Tooltip
              content={
                <VolumeTooltip
                  unitSingular={unitSingular}
                  unitPlural={unitPlural}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={stroke}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

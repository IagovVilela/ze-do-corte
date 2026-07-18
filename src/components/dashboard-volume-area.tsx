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

import { useAdminChartColors } from "@/components/admin-theme-provider";
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
    <div className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-chart-tooltip-bg)] px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-[var(--bn-on)]">{day}</p>
      <p className="mt-1 text-[var(--bn-on-variant)]">
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
  const chart = useAdminChartColors();

  return (
    <div className="rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-hover)] p-5">
      <h3 className="text-lg font-medium tracking-tight text-[var(--bn-on)]">{title}</h3>
      <p className="mt-1 text-sm text-[var(--bn-muted)]">
        <span className="text-[var(--bn-on-variant)]">{subtitle}</span>
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
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
            <XAxis
              dataKey="dateLabel"
              tick={{ fill: chart.tick, fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: chart.tick, fontSize: 11 }}
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

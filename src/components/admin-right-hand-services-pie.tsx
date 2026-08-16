"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { AdminRightHandChartShell } from "@/components/admin-right-hand-chart-shell";
import { useAdminChartColors } from "@/components/admin-theme-provider";
import type { DashboardServiceBar } from "@/lib/types";

type Props = {
  data: DashboardServiceBar[];
  periodLabel: string;
};

export function AdminRightHandServicesPie({ data, periodLabel }: Props) {
  const chart = useAdminChartColors();
  const slices = data.slice(0, 6).map((d) => ({
    name: d.name,
    value: d.count,
  }));
  const palette = [
    chart.info,
    chart.positive,
    chart.muted,
    chart.danger,
    chart.peak,
    chart.valley,
  ];
  const hasAny = slices.some((s) => s.value > 0);

  return (
    <AdminRightHandChartShell
      title="O que sustenta o caixa"
      subtitle={`Mix de serviços · ${periodLabel}`}
    >
      <div className="h-52">
        {hasAny ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={72}
                paddingAngle={2}
              >
                {slices.map((_, i) => (
                  <Cell
                    key={slices[i]!.name}
                    fill={palette[i % palette.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: chart.tooltipBorder,
                  background: chart.tooltipBg,
                  color: chart.tooltipColor,
                }}
                labelStyle={{ color: chart.tooltipColor }}
                itemStyle={{ color: chart.tooltipColor }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--bn-muted)]">
            Sem serviços no período.
          </div>
        )}
      </div>
      <ul className="mt-2 space-y-1 text-xs text-[var(--bn-muted)]">
        {slices.slice(0, 4).map((s, i) => (
          <li key={s.name} className="flex justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 truncate">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: palette[i % palette.length] }}
              />
              {s.name}
            </span>
            <span>{s.value}</span>
          </li>
        ))}
      </ul>
    </AdminRightHandChartShell>
  );
}

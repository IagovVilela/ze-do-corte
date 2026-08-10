"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAdminChartColors } from "@/components/admin-theme-provider";
import type { CohortBucket } from "@/lib/right-hand-metrics";

type Props = {
  cohorts: CohortBucket[];
};

export function AdminRightHandCohort({ cohorts }: Props) {
  const chart = useAdminChartColors();
  const data = cohorts.map((c) => ({
    name: `${c.windowDays}d`,
    rate: c.ratePercent,
    eligible: c.eligible,
    returned: c.returned,
  }));
  const hasEligible = cohorts.some((c) => c.eligible > 0);

  return (
    <div className="rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface)] p-5">
      <h3 className="text-sm font-semibold text-[var(--bn-on)]">
        Retenção por coorte
      </h3>
      <p className="mt-1 text-xs text-[var(--bn-muted)]">
        % que voltou em 30 / 60 / 90 dias após o 1º atendimento concluído
      </p>
      <div className="mt-4 h-52">
        {hasEligible ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis
                dataKey="name"
                tick={{ fill: chart.tick, fontSize: 11 }}
              />
              <YAxis
                tick={{ fill: chart.tick, fontSize: 10 }}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: chart.tooltipBorder,
                  background: chart.tooltipBg,
                  color: chart.tooltipColor,
                }}
                formatter={(value, _name, item) => {
                  const p = item?.payload as {
                    eligible?: number;
                    returned?: number;
                  };
                  return [
                    `${Number(value ?? 0)}% (${p?.returned ?? 0}/${p?.eligible ?? 0})`,
                    "Retorno",
                  ];
                }}
              />
              <Bar
                dataKey="rate"
                name="Retorno"
                fill="#38bdf8"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--bn-muted)]">
            Ainda sem base elegível para coorte (precisa de histórico).
          </div>
        )}
      </div>
    </div>
  );
}

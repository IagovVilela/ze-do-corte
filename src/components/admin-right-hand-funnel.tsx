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
import type { RightHandFunnel } from "@/lib/admin-right-hand-types";

type Props = {
  funnel: RightHandFunnel;
  periodLabel: string;
};

export function AdminRightHandFunnel({ funnel, periodLabel }: Props) {
  const chart = useAdminChartColors();
  const data = [
    { stage: "Agendado", value: funnel.scheduled },
    { stage: "Confirmado", value: funnel.confirmed },
    { stage: "Concluído", value: funnel.completed },
    { stage: "Pago", value: funnel.paid },
  ];
  const max = Math.max(...data.map((d) => d.value), 1);
  const hasAny = data.some((d) => d.value > 0);

  return (
    <div className="rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface)] p-5">
      <h3 className="text-sm font-semibold text-[var(--bn-on)]">
        Funil de conversão
      </h3>
      <p className="mt-1 text-xs text-[var(--bn-muted)]">
        Onde a operação perde dinheiro · {periodLabel}
      </p>
      <div className="mt-4 h-56">
        {hasAny ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis
                type="number"
                domain={[0, Math.ceil(max * 1.1)]}
                tick={{ fill: chart.tick, fontSize: 10 }}
              />
              <YAxis
                type="category"
                dataKey="stage"
                width={88}
                tick={{ fill: chart.tick, fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: chart.tooltipBorder,
                  background: chart.tooltipBg,
                  color: chart.tooltipColor,
                }}
              />
              <Bar
                dataKey="value"
                name="Qtd"
                fill="var(--bn-primary)"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--bn-muted)]">
            Sem volume neste período.
          </div>
        )}
      </div>
      {funnel.completed > 0 && funnel.paid === 0 ? (
        <p className="mt-2 text-xs text-[var(--bn-status-danger)]">
          Há concluídos sem pagamento — priorize o caixa a receber.
        </p>
      ) : null}
    </div>
  );
}

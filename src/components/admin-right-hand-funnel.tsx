"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AdminRightHandChartShell } from "@/components/admin-right-hand-chart-shell";
import { useAdminChartColors } from "@/components/admin-theme-provider";
import type { RightHandFunnel } from "@/lib/admin-right-hand-types";
import type { ConfidenceLevel } from "@/lib/right-hand-confidence";

type Props = {
  funnel: RightHandFunnel;
  periodLabel: string;
  confidence?: ConfidenceLevel;
  highlightStage?: "scheduled" | "confirmed" | "completed" | "paid";
  callout?: string;
  compact?: boolean;
};

export function AdminRightHandFunnel({
  funnel,
  periodLabel,
  confidence = "conclusive",
  highlightStage,
  callout,
  compact = false,
}: Props) {
  const chart = useAdminChartColors();
  const data = [
    { stage: "Agendado", key: "scheduled" as const, value: funnel.scheduled },
    { stage: "Confirmado", key: "confirmed" as const, value: funnel.confirmed },
    { stage: "Concluído", key: "completed" as const, value: funnel.completed },
    { stage: "Pago", key: "paid" as const, value: funnel.paid },
  ];
  const max = Math.max(...data.map((d) => d.value), 1);
  const hasAny = data.some((d) => d.value > 0);

  const body = (
    <>
      <div className={compact ? "h-40" : "h-56"}>
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
                labelStyle={{ color: chart.tooltipColor }}
                itemStyle={{ color: chart.tooltipColor }}
              />
              <Bar dataKey="value" name="Qtd" radius={[0, 6, 6, 0]}>
                {data.map((d) => (
                  <Cell
                    key={d.key}
                    fill={
                      highlightStage === d.key ? chart.danger : chart.info
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--bn-muted)]">
            Sem volume neste período.
          </div>
        )}
      </div>
      {callout ? (
        <p className="mt-2 text-xs font-medium text-[var(--bn-rh-danger)]">
          {callout}
        </p>
      ) : null}
      {funnel.completed > 0 && funnel.paid === 0 ? (
        <p className="mt-2 text-xs text-[var(--bn-rh-danger)]">
          Há concluídos sem pagamento — priorize o caixa a receber.
        </p>
      ) : null}
    </>
  );

  if (compact) return body;

  return (
    <AdminRightHandChartShell
      id="funil"
      title="Funil de conversão"
      subtitle={`Onde a operação perde dinheiro · ${periodLabel}`}
      confidence={confidence}
    >
      {body}
    </AdminRightHandChartShell>
  );
}

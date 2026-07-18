"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAdminChartColors } from "@/components/admin-theme-provider";
import type { DashboardRevenuePoint } from "@/lib/types";

type Props = {
  data: DashboardRevenuePoint[];
  periodLabel: string;
};

export function DashboardRevenueLine({ data, periodLabel }: Props) {
  const chart = useAdminChartColors();
  const maxAmt = Math.max(...data.map((d) => d.amount), 1);
  const hasAny = data.some((d) => d.amount > 0);

  return (
    <div className="glass-card rounded-2xl border border-sky-500/15 p-5 shadow-[0_0_40px_-20px_rgba(59,130,246,0.35)]">
      <h3 className="font-display text-xl font-normal uppercase tracking-wide text-[var(--bn-primary)]">
        Recebimentos
      </h3>
      <p className="mt-1 text-sm text-[var(--bn-muted)]">
        Soma por <span className="text-[var(--bn-on-variant)]">data do pagamento</span> registrada
        (após &quot;Marcar como pago&quot;) — inclui reservas{" "}
        <span className="text-[var(--bn-on-variant)]">confirmadas</span> ou{" "}
        <span className="text-[var(--bn-on-variant)]">concluídas</span> · {periodLabel}
      </p>
      <div className="mt-5 h-56">
        {hasAny ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis
                dataKey="dateLabel"
                tick={{ fill: chart.tick, fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: chart.tick, fontSize: 10 }}
                width={44}
                domain={[0, Math.ceil(maxAmt * 1.1)]}
                tickFormatter={(v) => `R$${v}`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: chart.tooltipBorder,
                  background: chart.tooltipBg,
                  color: chart.tooltipColor,
                }}
                formatter={(value) => [
                  `R$ ${Number(value ?? 0).toFixed(2)}`,
                  "Recebido",
                ]}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ fill: "#3b82f6", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-[var(--bn-border)] bg-[var(--bn-hover)] text-sm text-[var(--bn-muted)]">
            Sem pagamentos registados neste intervalo (use &quot;Marcar como pago&quot; na lista).
            Só entram registos cuja <span className="text-[var(--bn-muted)]">data do pagamento</span>{" "}
            cai no período das abas.
          </div>
        )}
      </div>
    </div>
  );
}

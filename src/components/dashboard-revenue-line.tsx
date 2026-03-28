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

import type { DashboardRevenuePoint } from "@/lib/types";

type Props = {
  data: DashboardRevenuePoint[];
  periodLabel: string;
};

export function DashboardRevenueLine({ data, periodLabel }: Props) {
  const maxAmt = Math.max(...data.map((d) => d.amount), 1);
  const hasAny = data.some((d) => d.amount > 0);

  return (
    <div className="glass-card rounded-2xl border border-amber-500/15 p-5 shadow-[0_0_40px_-20px_rgba(245,158,11,0.35)]">
      <h3 className="font-display text-xl font-normal uppercase tracking-wide text-amber-200/90">
        Recebimentos
      </h3>
      <p className="mt-1 text-sm text-zinc-400">
        Soma por <span className="text-zinc-300">data do pagamento</span> registrada (após
        &quot;Marcar como pago&quot;) — inclui reservas <span className="text-zinc-300">confirmadas</span>{" "}
        ou <span className="text-zinc-300">concluídas</span> · {periodLabel}
      </p>
      <div className="mt-5 h-56">
        {hasAny ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis
                dataKey="dateLabel"
                tick={{ fill: "#a1a1aa", fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#a1a1aa", fontSize: 10 }}
                width={44}
                domain={[0, Math.ceil(maxAmt * 1.1)]}
                tickFormatter={(v) => `R$${v}`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(245,158,11,0.25)",
                  background: "#11131a",
                }}
                formatter={(value) => [
                  `R$ ${Number(value ?? 0).toFixed(2)}`,
                  "Recebido",
                ]}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#fbbf24"
                strokeWidth={2.5}
                dot={{ fill: "#fbbf24", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-sm text-zinc-500">
            Sem pagamentos registados neste intervalo (use &quot;Marcar como pago&quot; na lista).
            Só entram registos cuja <span className="text-zinc-400">data do pagamento</span> cai no
            período das abas.
          </div>
        )}
      </div>
    </div>
  );
}

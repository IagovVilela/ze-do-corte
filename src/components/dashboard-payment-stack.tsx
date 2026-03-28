"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DashboardPaymentStackRow } from "@/lib/types";

type Props = {
  data: DashboardPaymentStackRow[];
  periodLabel: string;
};

export function DashboardPaymentStack({ data, periodLabel }: Props) {
  const row = data[0];
  const total = row ? row.pagos + row.aReceber : 0;

  return (
    <div className="glass-card rounded-2xl border border-emerald-500/10 p-5">
      <h3 className="font-display text-xl font-normal uppercase tracking-wide text-emerald-200/90">
        Pagamentos (concluídos)
      </h3>
      <p className="mt-1 text-sm text-zinc-400">
        <span className="text-zinc-300">Confirmadas ou concluídas</span> com{" "}
        <span className="text-zinc-300">início</span> ou{" "}
        <span className="text-zinc-300">pagamento registado</span> no período ·{" "}
        <span className="text-zinc-300">{periodLabel}</span>
      </p>
      <div className="mt-5 h-48">
        {total > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal />
              <XAxis type="number" allowDecimals={false} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={160}
                tick={{ fill: "#d4d4d8", fontSize: 11 }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "#11131a",
                }}
              />
              <Legend
                formatter={(v) => <span className="text-sm text-zinc-300">{v}</span>}
              />
              <Bar dataKey="pagos" stackId="p" fill="#34d399" name="Pago" radius={[0, 0, 0, 0]} />
              <Bar
                dataKey="aReceber"
                stackId="p"
                fill="#fb923c"
                name="A receber"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-sm text-zinc-500">
            Nenhuma reserva confirmada ou concluída com início ou pagamento neste período. Alargue
            o intervalo (Hoje / 7 dias / Mês / 3 meses) se precisar.
          </div>
        )}
      </div>
    </div>
  );
}

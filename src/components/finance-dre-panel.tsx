"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { LoaderCircle } from "lucide-react";
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

import { formatMoney } from "@/lib/utils";

type DreLine = {
  key: string;
  label: string;
  amount: number;
  level: number;
  isTotal?: boolean;
};

type DreData = {
  yearMonth: string;
  lines: DreLine[];
  previousMonth: { yearMonth: string; netResult: number } | null;
};

export function FinanceDrePanel() {
  const [yearMonth, setYearMonth] = useState(format(new Date(), "yyyy-MM"));
  const [data, setData] = useState<DreData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/finance/dre?yearMonth=${yearMonth}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      setData((await res.json()) as DreData);
    } finally {
      setLoading(false);
    }
  }, [yearMonth]);

  useEffect(() => {
    void load();
  }, [load]);

  const chartData =
    data?.lines
      .filter((l) => l.isTotal || l.key === "gross" || l.key === "net")
      .map((l) => ({
        name: l.label.replace(/\(−\) /, ""),
        value: l.amount,
      })) ?? [];

  return (
    <div className="space-y-6">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-[var(--bn-on-variant)]">Mês de referência</span>
        <input
          type="month"
          value={yearMonth}
          onChange={(e) => setYearMonth(e.target.value)}
          className="min-h-11 w-full max-w-xs rounded-xl border border-[var(--bn-outline)] bg-[var(--bn-surface)] px-3 py-2 text-sm sm:min-h-0"
        />
      </label>

      {loading || !data ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="h-8 w-8 animate-spin text-[var(--bn-primary)]" />
        </div>
      ) : (
        <>
          {data.previousMonth ? (
            <p className="text-sm text-[var(--bn-on-variant)]">
              Resultado líquido mês anterior ({data.previousMonth.yearMonth}):{" "}
              <strong className="text-[var(--bn-on)]">
                {formatMoney(data.previousMonth.netResult)}
              </strong>
            </p>
          ) : null}

          <div className="overflow-x-auto rounded-2xl border border-[var(--bn-outline)]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--bn-outline)] bg-[var(--bn-surface)]">
                  <th className="px-4 py-3 text-left font-medium text-[var(--bn-on-variant)]">
                    Linha
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--bn-on-variant)]">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.lines.map((line) => (
                  <tr
                    key={line.key}
                    className={`border-b border-[var(--bn-outline)]/60 ${
                      line.isTotal ? "bg-[var(--bn-surface)] font-semibold" : ""
                    }`}
                  >
                    <td
                      className="px-4 py-2.5 text-[var(--bn-on)]"
                      style={{ paddingLeft: `${16 + line.level * 16}px` }}
                    >
                      {line.label}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right tabular-nums ${
                        line.amount < 0
                          ? "text-[var(--bn-status-danger)]"
                          : "text-[var(--bn-on)]"
                      }`}
                    >
                      {formatMoney(line.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bn-outline)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.value >= 0
                          ? "var(--bn-primary)"
                          : "var(--bn-status-danger)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

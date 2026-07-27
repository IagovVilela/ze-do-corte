"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format, subMonths } from "date-fns";
import { LoaderCircle } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAdminChartColors } from "@/components/admin-theme-provider";
import type { AdminEvolutionSnapshot } from "@/lib/admin-evolution-types";
import { cn, formatMoney } from "@/lib/utils";

type UnitOpt = { id: string; name: string };

type Props = {
  units: UnitOpt[];
  initial: AdminEvolutionSnapshot;
};

export function AdminEvolutionPanel({ units, initial }: Props) {
  const chart = useAdminChartColors();
  const [from, setFrom] = useState(
    format(subMonths(new Date(), 11), "yyyy-MM-dd"),
  );
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [unitId, setUnitId] = useState("");
  const [unitTab, setUnitTab] = useState<string>("all");
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [rankingMonth, setRankingMonth] = useState(initial.rankingMonthKey);

  const load = useCallback(
    async (monthKey?: string) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ from, to });
        if (unitId) qs.set("unitId", unitId);
        qs.set("rankingMonth", monthKey ?? rankingMonth);
        const res = await fetch(`/api/admin/evolution?${qs}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const snap = (await res.json()) as AdminEvolutionSnapshot;
        setData(snap);
        setRankingMonth(snap.rankingMonthKey);
      } finally {
        setLoading(false);
      }
    },
    [from, to, unitId, rankingMonth],
  );

  useEffect(() => {
    setData(initial);
    setRankingMonth(initial.rankingMonthKey);
  }, [initial]);

  const growthChartData = useMemo(() => {
    if (unitTab === "all") {
      const rows = data.months.map((m) => {
        const row: Record<string, string | number> = {
          label: m.label,
          key: m.key,
        };
        for (const u of data.unitSeries) {
          const pt = u.months.find((x) => x.key === m.key);
          row[u.unitName] = pt?.revenue ?? 0;
        }
        return row;
      });
      return rows;
    }
    const series = data.unitSeries.find((u) => u.unitId === unitTab);
    return (series?.months ?? data.months.map((m) => ({
      key: m.key,
      label: m.label,
      revenue: m.revenue,
    }))).map((m) => ({
      label: m.label,
      key: m.key,
      Faturamento: "revenue" in m ? m.revenue : 0,
    }));
  }, [data, unitTab]);

  const unitColors = [
    "#3b82f6",
    "#38bdf8",
    "#a78bfa",
    "#34d399",
    "#f59e0b",
    "#f472b6",
  ];

  const field =
    "min-h-11 w-full rounded-xl border border-[var(--bn-outline)] bg-[var(--bn-surface)] px-3 py-2 text-sm text-[var(--bn-on)] sm:min-h-0 sm:w-auto";

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--bn-on-variant)]">Data inicial</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--bn-on-variant)]">Data final</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={field}
          />
        </label>
        {units.length > 1 ? (
          <label className="flex w-full flex-col gap-1 sm:w-auto">
            <span className="text-xs text-[var(--bn-on-variant)]">Filial</span>
            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className={cn(field, "sm:min-w-[10rem]")}
            >
              <option value="">Todas</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          onClick={() => void load()}
          className="min-h-11 w-full rounded-xl bg-[var(--bn-primary)] px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:opacity-90 sm:min-h-0 sm:w-auto sm:py-2"
        >
          Filtrar
        </button>
        {loading ? (
          <LoaderCircle className="mx-auto size-5 animate-spin text-[var(--bn-primary)] sm:mx-0" />
        ) : null}
      </div>

      <section className="rounded-2xl border border-[var(--bn-outline)] bg-[var(--bn-surface-elevated)] p-4 sm:p-5">
        <h2 className="text-base font-semibold text-[var(--bn-on)] sm:text-lg">
          Faturamento consolidado
        </h2>
        <p className="mt-1 text-sm text-[var(--bn-on-variant)]">
          Recebimentos por mês (pagamentos registrados no caixa).
        </p>
        <div className="mt-4 -mx-1 h-52 sm:mx-0 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.months} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="evoRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="label" tick={{ fill: chart.tick, fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis
                tick={{ fill: chart.tick, fontSize: 10 }}
                width={44}
                tickFormatter={(v) => `R$${Number(v) / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: chart.tooltipBorder,
                  background: chart.tooltipBg,
                  color: chart.tooltipColor,
                }}
                formatter={(v) => [formatMoney(Number(v ?? 0)), "Faturamento"]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                fill="url(#evoRev)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          title="Clientes atendidos"
          rows={[
            ["Dia anterior", data.kpis.clientsYesterday],
            ["Semana", data.kpis.clientsWeek],
            ["Mês", data.kpis.clientsMonth],
          ]}
        />
        <KpiCard
          title="Serviços realizados"
          rows={[
            ["Dia anterior", data.kpis.servicesYesterday],
            ["Semana", data.kpis.servicesWeek],
            ["Mês", data.kpis.servicesMonth],
          ]}
        />
        <KpiCard
          title="Agendamentos sem preferência"
          rows={[["Semana atual", data.kpis.noPreferenceWeek]]}
        />
        <KpiCard
          title="Clientes novos"
          rows={[["Semana atual", data.kpis.newClientsWeek]]}
        />
        <KpiCard
          title="Avaliações da empresa"
          rows={[
            [
              "Média (12 meses)",
              data.kpis.ratingAvg != null
                ? data.kpis.ratingAvg.toFixed(2)
                : "0,00",
            ],
            ["Quantidade", data.kpis.ratingCount],
          ]}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--bn-outline)] bg-[var(--bn-surface-elevated)] p-4 sm:p-5">
          <p className="text-xs font-semibold tracking-wide text-[var(--bn-on-variant)] uppercase">
            Profissional que mais atende
          </p>
          <p className="mt-2 truncate text-xl font-bold text-[var(--bn-primary)] sm:text-2xl">
            {data.kpis.topProfessionalName ?? "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--bn-outline)] bg-[var(--bn-surface-elevated)] p-4 sm:p-5">
          <p className="text-xs font-semibold tracking-wide text-[var(--bn-on-variant)] uppercase">
            Atendimentos no ano
          </p>
          <p className="mt-2 text-xl font-bold tabular-nums text-[var(--bn-primary)] sm:text-2xl">
            {data.kpis.yearAppointments}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ReturnCard
          title="Taxa de retorno"
          rate30={data.returnRate.rate30}
          rate60={data.returnRate.rate60}
          footer={[
            data.returnRate.bestUnitName
              ? `Unidade com maior retorno: ${data.returnRate.bestUnitName}`
              : null,
            data.returnRate.bestStaffName
              ? `Profissional com maior retorno: ${data.returnRate.bestStaffName}`
              : null,
          ]}
        />
        <ReturnCard
          title="Taxa de retorno sobre clientes novos"
          rate30={data.newClientReturn.rate30}
          rate60={data.newClientReturn.rate60}
        />
        <ReturnCard
          title="Clientes perdidos"
          rate30={data.lostClients.rate30}
          rate60={data.lostClients.rate60}
        />
      </div>

      <section className="rounded-2xl border border-[var(--bn-outline)] bg-[var(--bn-surface-elevated)] p-4 sm:p-5">
        <h2 className="text-base font-semibold text-[var(--bn-on)] sm:text-lg">
          Agendamento sem preferência
        </h2>
        <div className="mt-4 -mx-1 h-48 sm:mx-0 sm:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.months} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="label" tick={{ fill: chart.tick, fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: chart.tick, fontSize: 10 }} width={32} />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: chart.tooltipBorder,
                  background: chart.tooltipBg,
                  color: chart.tooltipColor,
                }}
              />
              <Area
                type="monotone"
                dataKey="noPreference"
                name="Sem preferência"
                stroke="#f59e0b"
                fill="#f59e0b33"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <h3 className="mt-6 text-sm font-semibold text-[var(--bn-on)] sm:mt-8">
          Ranking dos profissionais que mais atenderam sem preferência
        </h3>
        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {data.months.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => void load(m.key)}
              className={cn(
                "min-h-9 shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                rankingMonth === m.key
                  ? "bg-[var(--bn-primary)] text-white"
                  : "bg-[var(--bn-surface)] text-[var(--bn-on-variant)] hover:text-[var(--bn-on)]",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <ul className="mt-4 divide-y divide-[var(--bn-outline)]">
          {data.noPreferenceRanking.length === 0 ? (
            <li className="py-6 text-center text-sm text-[var(--bn-on-variant)]">
              Sem dados neste mês.
            </li>
          ) : (
            data.noPreferenceRanking.map((r) => (
              <li
                key={r.staffMemberId}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative size-9 shrink-0 overflow-hidden rounded-full bg-[var(--bn-surface)]">
                    {r.imageUrl ? (
                      <Image
                        src={r.imageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="36px"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center text-xs font-bold text-[var(--bn-on-variant)]">
                        {r.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="truncate text-sm font-medium text-[var(--bn-on)]">
                    {r.name}
                  </span>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--bn-on)]">
                  {r.count}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--bn-outline)] bg-[var(--bn-surface-elevated)] p-4 sm:p-5">
        <h2 className="text-base font-semibold text-[var(--bn-on)] sm:text-lg">
          Crescimento do faturamento geral
        </h2>
        {data.unitSeries.length > 1 ? (
          <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            <button
              type="button"
              onClick={() => setUnitTab("all")}
              className={cn(
                "min-h-9 shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
                unitTab === "all"
                  ? "bg-[var(--bn-primary)] text-white"
                  : "bg-[var(--bn-surface)] text-[var(--bn-on-variant)]",
              )}
            >
              Todos
            </button>
            {data.unitSeries.map((u) => (
              <button
                key={u.unitId}
                type="button"
                onClick={() => setUnitTab(u.unitId)}
                className={cn(
                  "min-h-9 shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
                  unitTab === u.unitId
                    ? "bg-[var(--bn-primary)] text-white"
                    : "bg-[var(--bn-surface)] text-[var(--bn-on-variant)]",
                )}
              >
                {u.unitName}
              </button>
            ))}
          </div>
        ) : null}
        <div className="mt-4 -mx-1 h-52 sm:mx-0 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={growthChartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="label" tick={{ fill: chart.tick, fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis
                tick={{ fill: chart.tick, fontSize: 10 }}
                width={44}
                tickFormatter={(v) => `R$${Number(v) / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: chart.tooltipBorder,
                  background: chart.tooltipBg,
                  color: chart.tooltipColor,
                }}
                formatter={(v) => formatMoney(Number(v ?? 0))}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {unitTab === "all" ? (
                data.unitSeries.map((u, i) => (
                  <Line
                    key={u.unitId}
                    type="monotone"
                    dataKey={u.unitName}
                    stroke={unitColors[i % unitColors.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))
              ) : (
                <Line
                  type="monotone"
                  dataKey="Faturamento"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--bn-outline)] bg-[var(--bn-surface-elevated)] p-4 sm:p-5">
        <h2 className="text-base font-semibold text-[var(--bn-on)] sm:text-lg">
          Crescimento de assinaturas (clube)
        </h2>
        <div className="mt-4 -mx-1 h-48 sm:mx-0 sm:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.months} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="label" tick={{ fill: chart.tick, fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis
                tick={{ fill: chart.tick, fontSize: 10 }}
                width={44}
                tickFormatter={(v) => `R$${Number(v) / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: chart.tooltipBorder,
                  background: chart.tooltipBg,
                  color: chart.tooltipColor,
                }}
                formatter={(v) => [formatMoney(Number(v ?? 0)), "Clube"]}
              />
              <Area
                type="monotone"
                dataKey="clubRevenue"
                stroke="#38bdf8"
                fill="#38bdf833"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  title,
  rows,
}: {
  title: string;
  rows: [string, string | number][];
}) {
  return (
    <div className="rounded-2xl border border-[var(--bn-outline)] bg-[var(--bn-surface-elevated)] p-4">
      <p className="text-xs font-semibold tracking-wide text-[var(--bn-on-variant)] uppercase">
        {title}
      </p>
      <ul className="mt-3 space-y-1.5">
        {rows.map(([label, value]) => (
          <li
            key={label}
            className="flex items-baseline justify-between gap-2 text-sm"
          >
            <span className="text-[var(--bn-on-variant)]">{label}</span>
            <span className="font-semibold tabular-nums text-[var(--bn-on)]">
              {value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReturnCard({
  title,
  rate30,
  rate60,
  footer,
}: {
  title: string;
  rate30: number;
  rate60: number;
  footer?: (string | null)[];
}) {
  return (
    <div className="rounded-2xl border border-[var(--bn-outline)] bg-[var(--bn-surface-elevated)] p-4 sm:p-5">
      <p className="text-sm font-semibold text-[var(--bn-on)]">{title}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-[var(--bn-on-variant)]">Geral 30 dias</p>
          <p className="text-xl font-bold tabular-nums text-[var(--bn-primary)] sm:text-2xl">
            {rate30.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--bn-on-variant)]">Geral 60 dias</p>
          <p className="text-xl font-bold tabular-nums text-[var(--bn-primary)] sm:text-2xl">
            {rate60.toFixed(2)}%
          </p>
        </div>
      </div>
      {footer?.filter(Boolean).length ? (
        <ul className="mt-4 space-y-1 text-xs break-words text-[var(--bn-on-variant)]">
          {footer.filter(Boolean).map((line) => (
            <li key={line!}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

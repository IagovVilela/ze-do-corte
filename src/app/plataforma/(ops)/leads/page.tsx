import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { endOfDay, startOfDay, subDays } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

import { DashboardVolumeArea } from "@/components/dashboard-volume-area";
import { BARBER_TIMEZONE } from "@/lib/constants";
import {
  buildVolumeBucketKeys,
  shopCalendarDayKey,
  type DashboardPeriodMeta,
} from "@/lib/dashboard-period";
import { phoneToWhatsAppHref } from "@/lib/phone-to-whatsapp-link";
import { prisma } from "@/lib/prisma";
import type { DashboardPoint } from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type LeadRange = "7d" | "30d" | "90d" | "all";

const TZ = BARBER_TIMEZONE;

function one(sp: Record<string, string | string[] | undefined>, key: string) {
  const v = sp[key];
  return typeof v === "string" ? v : Array.isArray(v) ? v[0] : "";
}

function parseLeadRange(raw: string | undefined): LeadRange {
  if (raw === "7d" || raw === "90d" || raw === "all") return raw;
  return "30d";
}

function leadPeriodMeta(range: LeadRange, now = new Date()): {
  from: Date | null;
  to: Date;
  periodLabel: string;
  chartMeta: DashboardPeriodMeta | null;
} {
  const zNow = toZonedTime(now, TZ);
  const to = fromZonedTime(endOfDay(zNow), TZ);

  if (range === "all") {
    return {
      from: null,
      to,
      periodLabel: "Todo o período",
      chartMeta: null,
    };
  }

  const daysBack = range === "7d" ? 6 : range === "30d" ? 29 : 89;
  const from = fromZonedTime(startOfDay(subDays(zNow, daysBack)), TZ);
  const periodLabel =
    range === "7d"
      ? "Últimos 7 dias"
      : range === "30d"
        ? "Últimos 30 dias"
        : "Últimos 90 dias";

  return {
    from,
    to,
    periodLabel,
    chartMeta: {
      range: range === "7d" ? "7d" : range === "90d" ? "3m" : "7d",
      from,
      to,
      granularity: "day",
      periodLabel,
    },
  };
}

function chartMetaFromSpan(from: Date, to: Date): DashboardPeriodMeta {
  return {
    range: "7d",
    from,
    to,
    granularity: "day",
    periodLabel: "Todo o período",
  };
}

function fillDaySeries(
  meta: DashboardPeriodMeta,
  dates: Date[],
): DashboardPoint[] {
  const map = new Map<string, number>();
  for (const d of dates) {
    const key = shopCalendarDayKey(d);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return buildVolumeBucketKeys(meta).map((b) => ({
    date: b.key,
    dateLabel: b.label,
    count: map.get(b.key) ?? 0,
  }));
}

function seriesForAll(dates: Date[], to: Date): DashboardPoint[] {
  if (dates.length === 0) {
    const zTo = toZonedTime(to, TZ);
    const from = fromZonedTime(startOfDay(subDays(zTo, 29)), TZ);
    return fillDaySeries(chartMetaFromSpan(from, to), []);
  }
  const oldest = dates.reduce((a, b) => (a < b ? a : b));
  const zOldest = toZonedTime(oldest, TZ);
  const from = fromZonedTime(startOfDay(zOldest), TZ);
  const spanDays =
    (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
  // Evita gráfico enorme se houver lead muito antigo: limita a 90 dias.
  if (spanDays > 90) {
    const zTo = toZonedTime(to, TZ);
    const clippedFrom = fromZonedTime(startOfDay(subDays(zTo, 89)), TZ);
    return fillDaySeries(chartMetaFromSpan(clippedFrom, to), dates);
  }
  return fillDaySeries(chartMetaFromSpan(from, to), dates);
}

export default async function PlataformaLeadsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = one(sp, "q").trim();
  const city = one(sp, "city").trim();
  const range = parseLeadRange(one(sp, "range") || undefined);
  const { from, to, periodLabel, chartMeta } = leadPeriodMeta(range);

  const where: Prisma.PlatformLeadWhereInput = {};
  if (from) {
    where.createdAt = { gte: from, lte: to };
  }
  if (city) {
    where.city = { contains: city, mode: "insensitive" };
  }
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { shopName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const leads = await prisma.platformLead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const createdDates = leads.map((l) => l.createdAt);
  const series =
    range === "all" || !chartMeta
      ? seriesForAll(createdDates, to)
      : fillDaySeries(chartMeta, createdDates);

  const chartSubtitle =
    range === "all" && createdDates.length > 0
      ? (() => {
          const oldest = createdDates.reduce((a, b) => (a < b ? a : b));
          const spanDays =
            (to.getTime() - oldest.getTime()) / (24 * 60 * 60 * 1000);
          return spanDays > 90
            ? "Últimos 90 dias (recorte do período completo)"
            : periodLabel;
        })()
      : periodLabel;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold tracking-[0.1em] text-brand-300 uppercase">
          Ops
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
          Leads ({leads.length})
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Formulário em{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-zinc-200">
            /lista-espera
          </code>{" "}
          (só por link — não aparece na landing). Divulgue o URL e acompanhe
          aqui.
        </p>
      </div>

      <form
        method="get"
        className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:items-end"
      >
        <label className="flex-1 text-xs text-zinc-500">
          Busca
          <input
            name="q"
            defaultValue={q}
            placeholder="Nome, barbearia, WhatsApp ou e-mail"
            className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500/50"
          />
        </label>
        <label className="text-xs text-zinc-500 sm:w-40">
          Cidade
          <input
            name="city"
            defaultValue={city}
            placeholder="Cidade"
            className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500/50"
          />
        </label>
        <label className="text-xs text-zinc-500 sm:w-40">
          Período
          <select
            name="range"
            defaultValue={range}
            className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="7d">7 dias</option>
            <option value="30d">30 dias</option>
            <option value="90d">90 dias</option>
            <option value="all">Tudo</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-brand-400"
        >
          Filtrar
        </button>
      </form>

      <DashboardVolumeArea
        data={series}
        title="Leads por dia"
        subtitle={chartSubtitle}
        unitSingular="lead"
        unitPlural="leads"
        stroke="#34d399"
        gradientId="leadsVolArea"
      />

      {leads.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 px-5 py-10 text-center text-sm text-zinc-500">
          Nenhum lead neste filtro. Ajuste a busca ou compartilhe{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-zinc-300">
            /lista-espera
          </code>
          .
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-[11px] font-bold tracking-wide text-zinc-400 uppercase">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">Barbearia</th>
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Obs.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leads.map((lead, index) => {
                const wa = phoneToWhatsAppHref(lead.phone);
                return (
                  <tr key={lead.id} className="text-zinc-200">
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                      {index + 1}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                      {lead.createdAt.toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">
                      {lead.name}
                    </td>
                    <td className="px-4 py-3">
                      {wa ? (
                        <Link
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-300 underline-offset-2 hover:underline"
                        >
                          {lead.phone}
                        </Link>
                      ) : (
                        lead.phone
                      )}
                    </td>
                    <td className="px-4 py-3">{lead.shopName}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {lead.city ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {lead.email ?? "—"}
                    </td>
                    <td className="max-w-[14rem] truncate px-4 py-3 text-zinc-500">
                      {lead.note ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

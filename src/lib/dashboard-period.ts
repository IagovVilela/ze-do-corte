import {
  addWeeks,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export type DashboardRange = "day" | "7d" | "month" | "3m";

export type DashboardSeriesGranularity = "hour" | "day" | "week";

export function parseDashboardRange(raw: string | undefined): DashboardRange {
  if (raw === "day" || raw === "7d" || raw === "month" || raw === "3m") return raw;
  /** Padrão: mês civil — costuma incluir mais agendamentos que “7 dias” (ex.: reservas só futuras). */
  return "month";
}

export type DashboardPeriodMeta = {
  range: DashboardRange;
  from: Date;
  to: Date;
  granularity: DashboardSeriesGranularity;
  /** Rótulo curto para gráficos (ex.: "Últimos 7 dias"). */
  periodLabel: string;
};

export function getDashboardPeriodMeta(
  range: DashboardRange,
  now: Date,
): DashboardPeriodMeta {
  const startToday = startOfDay(now);
  const endToday = endOfDay(now);

  switch (range) {
    case "day":
      return {
        range,
        from: startToday,
        to: endToday,
        granularity: "hour",
        periodLabel: `Hoje · ${format(now, "dd/MM/yyyy", { locale: ptBR })}`,
      };
    case "7d":
      return {
        range,
        from: startOfDay(subDays(now, 6)),
        to: endToday,
        granularity: "day",
        periodLabel: "Últimos 7 dias",
      };
    case "month": {
      const ms = startOfMonth(now);
      const raw = format(ms, "MMMM yyyy", { locale: ptBR });
      return {
        range,
        from: ms,
        to: endOfMonth(now),
        granularity: "day",
        periodLabel: raw.charAt(0).toUpperCase() + raw.slice(1),
      };
    }
    case "3m":
      return {
        range,
        from: startOfDay(subDays(now, 89)),
        to: endToday,
        granularity: "week",
        periodLabel: "Últimos 90 dias (por semana)",
      };
    default: {
      const _x: never = range;
      return _x;
    }
  }
}

/** Gera chaves de bucket vazias para a série temporal. */
export function buildVolumeBucketKeys(meta: DashboardPeriodMeta): {
  key: string;
  label: string;
}[] {
  const { from, to, granularity } = meta;
  if (granularity === "hour") {
    const keys: { key: string; label: string }[] = [];
    for (let h = 8; h <= 21; h += 1) {
      keys.push({
        key: `h${h}`,
        label: `${String(h).padStart(2, "0")}h`,
      });
    }
    return keys;
  }
  if (granularity === "day") {
    return eachDayOfInterval({ start: from, end: to }).map((d) => ({
      key: format(d, "yyyy-MM-dd"),
      label: format(d, "dd/MM", { locale: ptBR }),
    }));
  }
  const keys: { key: string; label: string }[] = [];
  let wk = startOfWeek(from, { weekStartsOn: 1 });
  const end = to;
  while (wk <= end) {
    const wEnd = endOfWeek(wk, { weekStartsOn: 1 });
    const k = format(wk, "yyyy-MM-dd");
    keys.push({
      key: k,
      label: `${format(wk, "dd/MM")}–${format(wEnd > end ? end : wEnd, "dd/MM")}`,
    });
    wk = addWeeks(wk, 1);
  }
  return keys;
}

export function bucketKeyForAppointment(
  meta: DashboardPeriodMeta,
  startsAt: Date,
): string | null {
  const { from, to, granularity } = meta;
  if (startsAt < from || startsAt > to) return null;
  if (granularity === "hour") {
    const h = startsAt.getHours();
    if (h < 8 || h > 21) return null;
    return `h${h}`;
  }
  if (granularity === "day") {
    return format(startsAt, "yyyy-MM-dd");
  }
  const wk = startOfWeek(startsAt, { weekStartsOn: 1 });
  return format(wk, "yyyy-MM-dd");
}

export function bucketKeyForRevenueDay(
  meta: DashboardPeriodMeta,
  paidAt: Date,
): string | null {
  const { from, to, granularity } = meta;
  if (paidAt < from || paidAt > to) return null;
  if (granularity === "hour") {
    const h = paidAt.getHours();
    if (h < 8 || h > 21) return null;
    return `h${h}`;
  }
  if (granularity === "day") {
    return format(paidAt, "yyyy-MM-dd");
  }
  const wk = startOfWeek(paidAt, { weekStartsOn: 1 });
  return format(wk, "yyyy-MM-dd");
}

import {
  addDays,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

import { BARBER_TIMEZONE } from "@/lib/constants";

const TZ = BARBER_TIMEZONE;

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
  switch (range) {
    case "day": {
      const zNow = toZonedTime(now, TZ);
      const zStart = startOfDay(zNow);
      const zEnd = endOfDay(zNow);
      const from = fromZonedTime(zStart, TZ);
      const to = fromZonedTime(zEnd, TZ);
      return {
        range,
        from,
        to,
        granularity: "hour",
        periodLabel: `Hoje · ${formatInTimeZone(now, TZ, "dd/MM/yyyy", { locale: ptBR })}`,
      };
    }
    case "7d": {
      const zNow = toZonedTime(now, TZ);
      const zEnd = endOfDay(zNow);
      const zFrom = startOfDay(subDays(zNow, 6));
      const from = fromZonedTime(zFrom, TZ);
      const to = fromZonedTime(zEnd, TZ);
      return {
        range,
        from,
        to,
        granularity: "day",
        periodLabel: "Últimos 7 dias",
      };
    }
    case "month": {
      const zNow = toZonedTime(now, TZ);
      const zStart = startOfMonth(zNow);
      const zEnd = endOfMonth(zNow);
      const from = fromZonedTime(zStart, TZ);
      const to = fromZonedTime(endOfDay(zEnd), TZ);
      const raw = formatInTimeZone(now, TZ, "MMMM yyyy", { locale: ptBR });
      return {
        range,
        from,
        to,
        granularity: "day",
        periodLabel: raw.charAt(0).toUpperCase() + raw.slice(1),
      };
    }
    case "3m": {
      const zNow = toZonedTime(now, TZ);
      const zEnd = endOfDay(zNow);
      const zFrom = startOfDay(subDays(zNow, 89));
      const from = fromZonedTime(zFrom, TZ);
      const to = fromZonedTime(zEnd, TZ);
      return {
        range,
        from,
        to,
        granularity: "week",
        periodLabel: "Últimos 90 dias (por semana)",
      };
    }
    default: {
      const _x: never = range;
      return _x;
    }
  }
}

/** Chave yyyy-MM-dd do instante no fuso da barbearia (alinhamento com buckets). */
export function shopCalendarDayKey(d: Date): string {
  return formatInTimeZone(d, TZ, "yyyy-MM-dd");
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
    const keys: { key: string; label: string }[] = [];
    let t = from;
    const endKey = shopCalendarDayKey(to);
    for (;;) {
      const key = shopCalendarDayKey(t);
      if (key > endKey) break;
      keys.push({
        key,
        label: formatInTimeZone(t, TZ, "dd/MM", { locale: ptBR }),
      });
      t = addDays(t, 1);
    }
    return keys;
  }
  const keys: { key: string; label: string }[] = [];
  let wkZ = startOfWeek(toZonedTime(from, TZ), { weekStartsOn: 1 });
  const endZ = toZonedTime(to, TZ);
  while (wkZ <= endZ) {
    const wEndZ = endOfWeek(wkZ, { weekStartsOn: 1 });
    const weekStartUtc = fromZonedTime(wkZ, TZ);
    const weekEndUtc = fromZonedTime(wEndZ, TZ);
    const key = formatInTimeZone(weekStartUtc, TZ, "yyyy-MM-dd");
    const labelEnd = weekEndUtc > to ? to : weekEndUtc;
    keys.push({
      key,
      label: `${formatInTimeZone(weekStartUtc, TZ, "dd/MM")}–${formatInTimeZone(labelEnd, TZ, "dd/MM")}`,
    });
    wkZ = addWeeks(wkZ, 1);
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
    const h = Number.parseInt(formatInTimeZone(startsAt, TZ, "H"), 10);
    if (h < 8 || h > 21) return null;
    return `h${h}`;
  }
  if (granularity === "day") {
    return shopCalendarDayKey(startsAt);
  }
  const z = toZonedTime(startsAt, TZ);
  const wkStart = startOfWeek(z, { weekStartsOn: 1 });
  return formatInTimeZone(fromZonedTime(wkStart, TZ), TZ, "yyyy-MM-dd");
}

export function bucketKeyForRevenueDay(
  meta: DashboardPeriodMeta,
  paidAt: Date,
): string | null {
  const { from, to, granularity } = meta;
  if (paidAt < from || paidAt > to) return null;
  if (granularity === "hour") {
    const h = Number.parseInt(formatInTimeZone(paidAt, TZ, "H"), 10);
    if (h < 8 || h > 21) return null;
    return `h${h}`;
  }
  if (granularity === "day") {
    return shopCalendarDayKey(paidAt);
  }
  const z = toZonedTime(paidAt, TZ);
  const wkStart = startOfWeek(z, { weekStartsOn: 1 });
  return formatInTimeZone(fromZonedTime(wkStart, TZ), TZ, "yyyy-MM-dd");
}

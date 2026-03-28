import { z } from "zod";

import {
  BARBER_CLOSE_SATURDAY_HOUR,
  BARBER_CLOSE_WEEKDAY_HOUR,
  BUSINESS_HOURS,
} from "@/lib/constants";

export const WORK_WEEK_DAY_KEYS = ["0", "1", "2", "3", "4", "5", "6"] as const;
export type WorkWeekDayKey = (typeof WORK_WEEK_DAY_KEYS)[number];

export type WorkDayState =
  | { closed: true }
  | { closed: false; start: string; end: string };

export type WorkWeekState = Record<WorkWeekDayKey, WorkDayState>;

const timeHalfHourRe = /^([01]\d|2[0-3]):(00|30)$/;

const closedDaySchema = z.object({ closed: z.literal(true) });
const openDaySchema = z.object({
  closed: z.literal(false).optional(),
  start: z.string().regex(timeHalfHourRe),
  end: z.string().regex(timeHalfHourRe),
});

const daySchema = z.union([closedDaySchema, openDaySchema]);

export const workWeekPayloadSchema = z.object({
  "0": daySchema,
  "1": daySchema,
  "2": daySchema,
  "3": daySchema,
  "4": daySchema,
  "5": daySchema,
  "6": daySchema,
});

export const workSchedulePatchSchema = z.union([
  workWeekPayloadSchema,
  z.object({ useShopDefault: z.literal(true) }),
]);

export const WORK_WEEK_LABELS_PT: Record<WorkWeekDayKey, string> = {
  "0": "Domingo",
  "1": "Segunda-feira",
  "2": "Terça-feira",
  "3": "Quarta-feira",
  "4": "Quinta-feira",
  "5": "Sexta-feira",
  "6": "Sábado",
};

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Instantes de 30 em 30 min desde `startHour`:00 até `endHourInclusive`:00 (inclusive). */
export function halfHourTimesBetween(
  startHour: number,
  endHourInclusive: number,
): string[] {
  const out: string[] = [];
  const startMin = startHour * 60;
  const endMin = endHourInclusive * 60;
  for (let m = startMin; m <= endMin; m += 30) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    out.push(`${String(h).padStart(2, "0")}:${mm === 0 ? "00" : "30"}`);
  }
  return out;
}

/** Inícios alinhados aos slots do agendamento; fins até o fechamento da loja naquele dia. */
export function timeChoicesForWorkDay(dayKey: WorkWeekDayKey): {
  starts: string[];
  ends: string[];
} {
  if (dayKey === "0") {
    return { starts: [], ends: [] };
  }
  const lastHour =
    dayKey === "6" ? BARBER_CLOSE_SATURDAY_HOUR : BARBER_CLOSE_WEEKDAY_HOUR;
  const closeMin = lastHour * 60;
  const starts = BUSINESS_HOURS.filter((t) => timeToMinutes(t) < closeMin);
  const ends = halfHourTimesBetween(9, lastHour);
  return { starts, ends };
}

/** Horário padrão da barbearia (alinhado a `BARBER_WEEKLY_SCHEDULE` / `isSlotWithinBusinessHours`). */
export function defaultWorkWeekFromShop(): WorkWeekState {
  const weekday: WorkDayState = {
    closed: false,
    start: "09:00",
    end: `${String(BARBER_CLOSE_WEEKDAY_HOUR).padStart(2, "0")}:00`,
  };
  const saturday: WorkDayState = {
    closed: false,
    start: "09:00",
    end: `${String(BARBER_CLOSE_SATURDAY_HOUR).padStart(2, "0")}:00`,
  };
  return {
    "0": { closed: true },
    "1": weekday,
    "2": weekday,
    "3": weekday,
    "4": weekday,
    "5": weekday,
    "6": saturday,
  };
}

/** Limites da loja em minutos desde 00:00 (fim = último instante em que o atendimento pode terminar). */
export function getShopScheduleBoundsMinutes(
  dayOfWeek: number,
): { start: number; end: number } | null {
  if (dayOfWeek === 0) return null;
  const start = 9 * 60;
  const endHour =
    dayOfWeek === 6 ? BARBER_CLOSE_SATURDAY_HOUR : BARBER_CLOSE_WEEKDAY_HOUR;
  return { start, end: endHour * 60 };
}

function parseStoredWeek(raw: unknown): WorkWeekState | null {
  const r = workWeekPayloadSchema.safeParse(raw);
  return r.success ? (r.data as WorkWeekState) : null;
}

/**
 * Expediente efetivo do barbeiro num dia (interseção com a loja).
 * `null` = dia sem atendimento (fechado na loja ou folga do barbeiro ou janela inválida).
 */
export function getEffectiveStaffDayBounds(
  workWeekJson: unknown,
  dayOfWeek: number,
): { start: number; end: number } | null {
  const shop = getShopScheduleBoundsMinutes(dayOfWeek);
  if (!shop) return null;

  const custom = parseStoredWeek(workWeekJson);
  if (!custom) return shop;

  const day = custom[String(dayOfWeek) as WorkWeekDayKey];
  if (!day) return shop;
  if ("closed" in day && day.closed) return null;

  const s = timeToMinutes(day.start);
  const e = timeToMinutes(day.end);
  if (s >= e) return null;

  const start = Math.max(shop.start, s);
  const end = Math.min(shop.end, e);
  if (start >= end) return null;
  return { start, end };
}

/** `workWeekJson` null → não restringe além da loja (comportamento anterior). */
export function isSlotWithinStaffSchedule(
  workWeekJson: unknown,
  slotStart: Date,
  durationMinutes: number,
): boolean {
  if (workWeekJson == null) return true;

  const day = slotStart.getDay();
  const bounds = getEffectiveStaffDayBounds(workWeekJson, day);
  if (!bounds) return false;

  const sh = slotStart.getHours();
  const sm = slotStart.getMinutes();
  const slotStartMin = sh * 60 + sm;
  const slotEndMin = slotStartMin + durationMinutes;

  return slotStartMin >= bounds.start && slotEndMin <= bounds.end;
}

export function validateWorkWeekAgainstShop(
  week: WorkWeekState,
): { ok: true } | { ok: false; message: string } {
  for (const key of WORK_WEEK_DAY_KEYS) {
    const day = week[key];
    const dow = Number(key);
    const shop = getShopScheduleBoundsMinutes(dow);

    if ("closed" in day && day.closed) {
      continue;
    }

    if (!shop) {
      return {
        ok: false,
        message: `${WORK_WEEK_LABELS_PT[key]}: a barbearia não abre neste dia — marque como folga.`,
      };
    }

    const open = day as { start: string; end: string };
    const s = timeToMinutes(open.start);
    const e = timeToMinutes(open.end);
    if (s >= e) {
      return {
        ok: false,
        message: `${WORK_WEEK_LABELS_PT[key]}: o início deve ser antes do fim.`,
      };
    }
    if (s < shop.start || e > shop.end) {
      return {
        ok: false,
        message: `${WORK_WEEK_LABELS_PT[key]}: o intervalo precisa ficar dentro do horário da barbearia neste dia.`,
      };
    }
  }
  return { ok: true };
}

export function parseWorkWeekFromDb(raw: unknown): WorkWeekState | null {
  return parseStoredWeek(raw);
}

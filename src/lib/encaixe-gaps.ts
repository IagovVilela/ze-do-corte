import { formatInTimeZone } from "date-fns-tz";

import { appointmentOverlapsSlot } from "@/lib/appointment-slot-conflict";
import { BARBER_TIMEZONE } from "@/lib/constants";
import {
  getShopClosingTime,
  getSlotEnd,
  getSlotStart,
  isSlotWithinBusinessHours,
} from "@/lib/utils";
import { isSlotWithinStaffSchedule } from "@/lib/work-week";

export type EncaixeBusyBlock = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  staffMemberId: string | null;
  clientName: string;
};

export type EncaixeGapSuggestion = {
  /** HH:mm no fuso da loja */
  time: string;
  endsAtLabel: string;
  /** Minutos livres no buraco a partir deste início */
  freeMinutes: number;
  kind: "clean";
};

export type EncaixeConflictInfo = {
  id: string;
  clientName: string;
  startsAtLabel: string;
  endsAtLabel: string;
};

function roundUpToStep(date: Date, stepMinutes: number): Date {
  const ms = stepMinutes * 60_000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

function timeLabel(d: Date): string {
  return formatInTimeZone(d, BARBER_TIMEZONE, "HH:mm");
}

/**
 * Sugere horários de encaixe limpo (sem overlap) no dia.
 * Prefere “agora” (arredondado) se couber; senão o início de cada buraco livre.
 */
export function suggestEncaixeGaps(options: {
  dayStart: Date;
  durationMinutes: number;
  appointments: EncaixeBusyBlock[];
  staffMemberId?: string | null;
  staffWorkWeekJson?: unknown;
  now?: Date;
}): EncaixeGapSuggestion[] {
  const now = options.now ?? new Date();
  const duration = options.durationMinutes;
  const open = getSlotStart(options.dayStart, "09:00");
  const close = getShopClosingTime(open);

  if (open.getDay() === 0) return [];

  const relevant = options.appointments
    .filter((a) => {
      if (!options.staffMemberId) return true;
      return (
        a.staffMemberId === options.staffMemberId || a.staffMemberId === null
      );
    })
    .slice()
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  type Window = { start: Date; end: Date };
  const windows: Window[] = [];
  let cursor = open;
  for (const appt of relevant) {
    if (appt.startsAt.getTime() > cursor.getTime()) {
      windows.push({
        start: cursor,
        end: new Date(Math.min(appt.startsAt.getTime(), close.getTime())),
      });
    }
    if (appt.endsAt.getTime() > cursor.getTime()) {
      cursor = new Date(
        Math.max(cursor.getTime(), appt.endsAt.getTime()),
      );
    }
  }
  if (cursor.getTime() < close.getTime()) {
    windows.push({ start: cursor, end: close });
  }

  const suggestions: EncaixeGapSuggestion[] = [];
  const seen = new Set<string>();

  for (const win of windows) {
    const freeMs = win.end.getTime() - win.start.getTime();
    if (freeMs < duration * 60_000) continue;

    const candidates: Date[] = [];
    const nowRounded = roundUpToStep(now, 5);
    if (
      nowRounded.getTime() >= win.start.getTime() &&
      nowRounded.getTime() + duration * 60_000 <= win.end.getTime()
    ) {
      candidates.push(nowRounded);
    }
    candidates.push(win.start);

    for (const start of candidates) {
      if (!isSlotWithinBusinessHours(start, duration)) continue;
      if (
        options.staffMemberId &&
        options.staffWorkWeekJson !== undefined &&
        !isSlotWithinStaffSchedule(
          options.staffWorkWeekJson,
          start,
          duration,
        )
      ) {
        continue;
      }
      const end = getSlotEnd(start, duration);
      if (end.getTime() > win.end.getTime()) continue;

      const overlaps = relevant.some((a) =>
        appointmentOverlapsSlot(
          a,
          start,
          end,
          options.staffMemberId ?? null,
        ),
      );
      if (overlaps) continue;

      const time = timeLabel(start);
      if (seen.has(time)) continue;
      seen.add(time);
      suggestions.push({
        time,
        endsAtLabel: timeLabel(end),
        freeMinutes: Math.floor(
          (win.end.getTime() - start.getTime()) / 60_000,
        ),
        kind: "clean",
      });
    }
  }

  return suggestions.slice(0, 12);
}

/** Lista agendamentos que sobrepõem o intervalo proposto. */
export function findEncaixeConflicts(
  appointments: EncaixeBusyBlock[],
  startsAt: Date,
  endsAt: Date,
  staffMemberId?: string | null,
): EncaixeConflictInfo[] {
  return appointments
    .filter((a) =>
      appointmentOverlapsSlot(a, startsAt, endsAt, staffMemberId ?? null),
    )
    .map((a) => ({
      id: a.id,
      clientName: a.clientName,
      startsAtLabel: timeLabel(a.startsAt),
      endsAtLabel: timeLabel(a.endsAt),
    }));
}

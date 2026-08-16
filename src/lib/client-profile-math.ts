import { differenceInCalendarDays } from "date-fns";

export const WINBACK_MIN_VISITS = 3;
export const WINBACK_GAP_FACTOR = 1.4;
export const WINBACK_MIN_OVERDUE_DAYS = 14;

/** Mediana de intervalos em dias entre visitas (mín. 3 datas). */
export function usualGapDaysFromVisits(datesAsc: Date[]): number | null {
  if (datesAsc.length < WINBACK_MIN_VISITS) return null;
  const gaps: number[] = [];
  for (let i = 1; i < datesAsc.length; i++) {
    gaps.push(
      differenceInCalendarDays(datesAsc[i]!, datesAsc[i - 1]!),
    );
  }
  if (gaps.length === 0) return null;
  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  const median =
    gaps.length % 2 === 0
      ? Math.round((gaps[mid - 1]! + gaps[mid]!) / 2)
      : gaps[mid]!;
  return Math.max(7, median);
}

export function isOverdueVsUsualGap(opts: {
  lastCompletedAt: Date;
  usualGapDays: number;
  now?: Date;
}): boolean {
  const days = differenceInCalendarDays(
    opts.now ?? new Date(),
    opts.lastCompletedAt,
  );
  const threshold = Math.max(
    WINBACK_MIN_OVERDUE_DAYS,
    Math.round(opts.usualGapDays * WINBACK_GAP_FACTOR),
  );
  return days >= threshold;
}

import { clsx, type ClassValue } from "clsx";
import { addMinutes, format } from "date-fns";

import {
  BARBER_CLOSE_SATURDAY_HOUR,
  BARBER_CLOSE_WEEKDAY_HOUR,
  BUSINESS_HOURS,
} from "@/lib/constants";

export function cn(...values: ClassValue[]) {
  return clsx(values);
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDateTime(value: Date) {
  return format(value, "dd/MM/yyyy HH:mm");
}

export function getSlotStart(date: Date, time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const slot = new Date(date);
  slot.setHours(hour, minute, 0, 0);
  return slot;
}

export function getSlotsForDate(date: Date) {
  return BUSINESS_HOURS.map((time) => getSlotStart(date, time));
}

export function getSlotEnd(start: Date, durationMinutes: number) {
  return addMinutes(start, durationMinutes);
}

/** Momento de fecho no mesmo dia civil do agendamento (seg–sex 20h, sáb 17h). */
export function getShopClosingTime(slotDay: Date): Date {
  const close = new Date(slotDay);
  if (close.getDay() === 6) {
    close.setHours(BARBER_CLOSE_SATURDAY_HOUR, 0, 0, 0);
  } else {
    close.setHours(BARBER_CLOSE_WEEKDAY_HOUR, 0, 0, 0);
  }
  return close;
}

/** Domingo fechado; outros dias o serviço tem de terminar até ao fecho. */
export function isSlotWithinBusinessHours(
  slotStart: Date,
  durationMinutes: number,
): boolean {
  if (slotStart.getDay() === 0) return false;
  const slotEnd = getSlotEnd(slotStart, durationMinutes);
  const close = getShopClosingTime(slotStart);
  return slotEnd.getTime() <= close.getTime();
}

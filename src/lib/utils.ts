import { clsx, type ClassValue } from "clsx";
import { addMinutes, format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

import {
  BARBER_TIMEZONE,
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
  const dayLabel = format(date, "yyyy-MM-dd");
  const localDateTime = new Date(`${dayLabel}T${time}:00`);
  return fromZonedTime(localDateTime, BARBER_TIMEZONE);
}

export function getSlotsForDate(date: Date) {
  return BUSINESS_HOURS.map((time) => getSlotStart(date, time));
}

export function getSlotEnd(start: Date, durationMinutes: number) {
  return addMinutes(start, durationMinutes);
}

/** Momento do fechamento no mesmo dia civil da barbearia (seg–sex 20h, sáb 17h). */
export function getShopClosingTime(slotDay: Date): Date {
  const zonedStart = toZonedTime(slotDay, BARBER_TIMEZONE);
  const closeHour =
    zonedStart.getDay() === 6
      ? BARBER_CLOSE_SATURDAY_HOUR
      : BARBER_CLOSE_WEEKDAY_HOUR;

  const zonedClose = new Date(zonedStart);
  zonedClose.setHours(closeHour, 0, 0, 0);

  return fromZonedTime(zonedClose, BARBER_TIMEZONE);
}

/** Domingo fechado; nos demais dias o serviço precisa terminar até o fechamento. */
export function isSlotWithinBusinessHours(
  slotStart: Date,
  durationMinutes: number,
): boolean {
  const zonedStart = toZonedTime(slotStart, BARBER_TIMEZONE);
  if (zonedStart.getDay() === 0) return false;

  const startMinutes = zonedStart.getHours() * 60 + zonedStart.getMinutes();
  const openMinutes = 9 * 60;
  if (startMinutes < openMinutes) return false;

  const slotEnd = getSlotEnd(slotStart, durationMinutes);
  const close = getShopClosingTime(slotStart);
  return slotEnd.getTime() <= close.getTime();
}

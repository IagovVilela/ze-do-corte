import { clsx, type ClassValue } from "clsx";
import { addMinutes, format } from "date-fns";

import { BUSINESS_HOURS } from "@/lib/constants";

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

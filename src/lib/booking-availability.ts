import "server-only";

import { format, startOfDay } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import { appointmentOverlapsSlot } from "@/lib/appointment-slot-conflict";
import { BARBER_TIMEZONE, BUSINESS_HOURS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
  getSlotEnd,
  getSlotStart,
  isSlotWithinBusinessHours,
} from "@/lib/utils";
import { isSlotWithinStaffSchedule } from "@/lib/work-week";

export type SlotAppointment = {
  startsAt: Date;
  endsAt: Date;
  staffMemberId: string | null;
};

export type StaffForAvailability = {
  id: string;
  workWeekJson: unknown;
  displayName: string | null;
};

export type AvailableSlotDetail = {
  hour: string;
  endsAtLabel: string;
  /** Profissional que cabe neste bloco (quando há equipe e nenhum foi escolhido). */
  suggestedStaffMemberId: string | null;
};

/**
 * Resolve duração efetiva de um ou mais serviços na unidade (overrides inclusos).
 */
export async function resolveBookingDurationMinutes(options: {
  organizationId: string;
  unitId: string | null;
  serviceIds: string[];
}): Promise<
  | { ok: true; durationMinutes: number; primaryServiceId: string }
  | { ok: false; message: string; status: number }
> {
  const ids = [...new Set(options.serviceIds.filter(Boolean))];
  if (ids.length === 0) {
    return { ok: false, message: "Informe ao menos um serviço.", status: 400 };
  }

  const services = await prisma.service.findMany({
    where: {
      id: { in: ids },
      unit: { organizationId: options.organizationId },
    },
    include: { unitOverrides: true },
  });

  if (services.length !== ids.length) {
    return { ok: false, message: "Serviço inválido.", status: 404 };
  }

  const byId = new Map(services.map((s) => [s.id, s]));
  let total = 0;

  for (const id of ids) {
    const service = byId.get(id)!;
    const unitOverride = options.unitId
      ? service.unitOverrides.find((o) => o.unitId === options.unitId)
      : undefined;

    if (options.unitId) {
      const allowed =
        service.unitId === options.unitId || Boolean(unitOverride);
      if (!allowed) {
        return {
          ok: false,
          message: "Serviço não disponível nesta unidade.",
          status: 400,
        };
      }
    }

    const isActive = unitOverride ? unitOverride.isActive : service.isActive;
    if (!isActive) {
      return {
        ok: false,
        message: "Serviço indisponível nesta unidade.",
        status: 404,
      };
    }

    const duration =
      unitOverride && unitOverride.durationMinutes !== null
        ? unitOverride.durationMinutes
        : service.durationMinutes;
    total += duration;
  }

  return {
    ok: true,
    durationMinutes: Math.min(480, Math.max(1, total)),
    primaryServiceId: ids[0]!,
  };
}

function staffCanTakeSlot(
  staff: StaffForAvailability,
  appointments: SlotAppointment[],
  slotStart: Date,
  durationMinutes: number,
): boolean {
  if (
    !isSlotWithinStaffSchedule(staff.workWeekJson, slotStart, durationMinutes)
  ) {
    return false;
  }
  const slotEnd = getSlotEnd(slotStart, durationMinutes);
  return !appointments.some((appointment) =>
    appointmentOverlapsSlot(appointment, slotStart, slotEnd, staff.id),
  );
}

/**
 * Calcula horários em que o bloco inteiro (duração total) cabe sem conflito.
 * Sem profissional: usa capacidade da equipe (qualquer barbeiro livre) ou, se
 * não houver equipe, bloqueio por unidade (legado).
 */
export function computeAvailableSlots(options: {
  dayStart: Date;
  durationMinutes: number;
  appointments: SlotAppointment[];
  staffRoster: StaffForAvailability[];
  bookWithStaffId?: string | null;
  now?: Date;
  candidateHours?: readonly string[];
}): AvailableSlotDetail[] {
  const now = options.now ?? new Date();
  const hours = options.candidateHours ?? BUSINESS_HOURS;
  const out: AvailableSlotDetail[] = [];

  for (const hour of hours) {
    const slotStart = getSlotStart(options.dayStart, hour);
    if (slotStart.getTime() <= now.getTime()) continue;
    if (!isSlotWithinBusinessHours(slotStart, options.durationMinutes)) {
      continue;
    }

    const slotEnd = getSlotEnd(slotStart, options.durationMinutes);
    const endsAtLabel = formatInTimeZone(
      slotEnd,
      BARBER_TIMEZONE,
      "HH:mm",
    );

    if (options.bookWithStaffId) {
      const staff = options.staffRoster.find(
        (s) => s.id === options.bookWithStaffId,
      );
      if (!staff) continue;
      if (
        !staffCanTakeSlot(
          staff,
          options.appointments,
          slotStart,
          options.durationMinutes,
        )
      ) {
        continue;
      }
      out.push({
        hour,
        endsAtLabel,
        suggestedStaffMemberId: staff.id,
      });
      continue;
    }

    if (options.staffRoster.length === 0) {
      const overlaps = options.appointments.some((appointment) =>
        appointmentOverlapsSlot(appointment, slotStart, slotEnd, null),
      );
      if (overlaps) continue;
      out.push({ hour, endsAtLabel, suggestedStaffMemberId: null });
      continue;
    }

    const freeStaff = options.staffRoster.find((staff) =>
      staffCanTakeSlot(
        staff,
        options.appointments,
        slotStart,
        options.durationMinutes,
      ),
    );
    if (!freeStaff) continue;
    out.push({
      hour,
      endsAtLabel,
      suggestedStaffMemberId: freeStaff.id,
    });
  }

  return out;
}

export async function loadDayAppointments(options: {
  unitId: string | null;
  dayStart: Date;
  excludeAppointmentId?: string;
}): Promise<SlotAppointment[]> {
  const dayEnd = new Date(options.dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return prisma.appointment.findMany({
    where: {
      ...(options.unitId ? { unitId: options.unitId } : {}),
      startsAt: { gte: options.dayStart, lt: dayEnd },
      status: { in: ["CONFIRMED", "COMPLETED"] },
      ...(options.excludeAppointmentId
        ? { id: { not: options.excludeAppointmentId } }
        : {}),
    },
    select: {
      startsAt: true,
      endsAt: true,
      staffMemberId: true,
    },
  });
}

export async function loadUnitStaffRoster(options: {
  organizationId: string;
  unitId: string;
}): Promise<StaffForAvailability[]> {
  return prisma.staffMember.findMany({
    where: {
      organizationId: options.organizationId,
      unitId: options.unitId,
      role: "STAFF",
    },
    select: {
      id: true,
      workWeekJson: true,
      displayName: true,
    },
    orderBy: [{ displayName: "asc" }, { email: "asc" }],
  });
}

/**
 * Lista slots livres para o dia (API pública / bot).
 */
export async function listPublicAvailableSlots(options: {
  organizationId: string;
  unitId: string | null;
  day: Date;
  durationMinutes: number;
  staffMemberId?: string | null;
  excludeAppointmentId?: string;
}): Promise<{
  date: string;
  durationMinutes: number;
  availableSlots: string[];
  slotDetails: AvailableSlotDetail[];
}> {
  const dayStart = startOfDay(options.day);
  const dateLabel = format(dayStart, "yyyy-MM-dd");

  if (dayStart.getDay() === 0) {
    return {
      date: dateLabel,
      durationMinutes: options.durationMinutes,
      availableSlots: [],
      slotDetails: [],
    };
  }

  const [appointments, staffRoster] = await Promise.all([
    loadDayAppointments({
      unitId: options.unitId,
      dayStart,
      excludeAppointmentId: options.excludeAppointmentId,
    }),
    options.unitId
      ? loadUnitStaffRoster({
          organizationId: options.organizationId,
          unitId: options.unitId,
        })
      : Promise.resolve([] as StaffForAvailability[]),
  ]);

  let roster = staffRoster;
  if (options.staffMemberId) {
    const one = staffRoster.find((s) => s.id === options.staffMemberId);
    if (!one) {
      return {
        date: dateLabel,
        durationMinutes: options.durationMinutes,
        availableSlots: [],
        slotDetails: [],
      };
    }
    roster = [one];
  }

  const slotDetails = computeAvailableSlots({
    dayStart,
    durationMinutes: options.durationMinutes,
    appointments,
    staffRoster: roster,
    bookWithStaffId: options.staffMemberId ?? null,
  });

  return {
    date: dateLabel,
    durationMinutes: options.durationMinutes,
    availableSlots: slotDetails.map((s) => s.hour),
    slotDetails,
  };
}

/**
 * Escolhe o primeiro profissional que cabe no bloco (para “qualquer barbeiro”).
 */
export function pickStaffForSlot(options: {
  staffRoster: StaffForAvailability[];
  appointments: SlotAppointment[];
  slotStart: Date;
  durationMinutes: number;
  preferredStaffMemberId?: string | null;
}): StaffForAvailability | null {
  if (options.preferredStaffMemberId) {
    const preferred = options.staffRoster.find(
      (s) => s.id === options.preferredStaffMemberId,
    );
    if (
      preferred &&
      staffCanTakeSlot(
        preferred,
        options.appointments,
        options.slotStart,
        options.durationMinutes,
      )
    ) {
      return preferred;
    }
    return null;
  }

  return (
    options.staffRoster.find((staff) =>
      staffCanTakeSlot(
        staff,
        options.appointments,
        options.slotStart,
        options.durationMinutes,
      ),
    ) ?? null
  );
}

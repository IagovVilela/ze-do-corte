import "server-only";

import { randomUUID } from "node:crypto";
import { parseISO, startOfDay } from "date-fns";
import type { Appointment, Service } from "@prisma/client";

import {
  findEncaixeConflicts,
  suggestEncaixeGaps,
  type EncaixeBusyBlock,
  type EncaixeConflictInfo,
  type EncaixeGapSuggestion,
} from "@/lib/encaixe-gaps";
import { notifyBarberNewAssignment } from "@/lib/notify-barber-booking";
import { prisma } from "@/lib/prisma";
import { formatBrPhoneNational } from "@/lib/br-phone-format";
import {
  getSlotEnd,
  getSlotStart,
  isSlotWithinBusinessHours,
} from "@/lib/utils";
import { isSlotWithinStaffSchedule } from "@/lib/work-week";

export const ENCAIXE_BOOKING_SOURCE = "encaixe";

export type EncaixePreviewResult =
  | {
      ok: true;
      durationMinutes: number;
      suggestions: EncaixeGapSuggestion[];
    }
  | { ok: false; message: string; status: number };

export type CreateEncaixeInput = {
  organizationId: string;
  unitId: string;
  serviceId: string;
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  notes?: string | null;
  staffMemberId?: string | null;
  /** Se true, cria mesmo com overlap (barbeiro assume o risco). */
  force?: boolean;
  createdByStaffId?: string;
};

export type CreateEncaixeResult =
  | {
      ok: true;
      appointment: Appointment & { service: Service };
      forced: boolean;
      conflicts: EncaixeConflictInfo[];
    }
  | {
      ok: false;
      message: string;
      status: number;
      conflicts?: EncaixeConflictInfo[];
      suggestions?: EncaixeGapSuggestion[];
    };

async function loadDayBusy(options: {
  unitId: string;
  dayStart: Date;
}): Promise<EncaixeBusyBlock[]> {
  const dayEnd = new Date(options.dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const rows = await prisma.appointment.findMany({
    where: {
      unitId: options.unitId,
      startsAt: { gte: options.dayStart, lt: dayEnd },
      status: { in: ["CONFIRMED", "COMPLETED"] },
    },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      staffMemberId: true,
      clientName: true,
    },
    orderBy: { startsAt: "asc" },
  });
  return rows;
}

async function resolveServiceDuration(options: {
  organizationId: string;
  unitId: string;
  serviceId: string;
}): Promise<
  | {
      ok: true;
      service: Service & {
        unitOverrides: {
          unitId: string;
          durationMinutes: number | null;
          price: unknown;
          isActive: boolean;
        }[];
      };
      durationMinutes: number;
      price: number;
    }
  | { ok: false; message: string; status: number }
> {
  const service = await prisma.service.findFirst({
    where: {
      id: options.serviceId,
      unit: { organizationId: options.organizationId },
    },
    include: { unitOverrides: true },
  });
  if (!service) {
    return { ok: false, message: "Serviço inválido.", status: 404 };
  }
  const ov = service.unitOverrides.find((o) => o.unitId === options.unitId);
  const active = ov ? ov.isActive : service.isActive;
  if (!active) {
    return {
      ok: false,
      message: "Serviço indisponível nesta unidade.",
      status: 404,
    };
  }
  if (service.unitId !== options.unitId && !ov) {
    return {
      ok: false,
      message: "Este serviço não está disponível na unidade selecionada.",
      status: 400,
    };
  }
  const durationMinutes =
    ov && ov.durationMinutes !== null
      ? ov.durationMinutes
      : service.durationMinutes;
  const price = Number(ov?.price != null ? ov.price : service.price);
  return { ok: true, service, durationMinutes, price };
}

export async function previewEncaixeGaps(options: {
  organizationId: string;
  unitId: string;
  serviceId: string;
  date: string;
  staffMemberId?: string | null;
}): Promise<EncaixePreviewResult> {
  const unit = await prisma.barbershopUnit.findFirst({
    where: {
      id: options.unitId,
      isActive: true,
      organizationId: options.organizationId,
    },
    select: { id: true },
  });
  if (!unit) {
    return { ok: false, message: "Unidade inválida.", status: 400 };
  }

  const resolved = await resolveServiceDuration({
    organizationId: options.organizationId,
    unitId: options.unitId,
    serviceId: options.serviceId,
  });
  if (!resolved.ok) return resolved;

  const day = parseISO(options.date);
  if (Number.isNaN(day.getTime())) {
    return { ok: false, message: "Data inválida.", status: 400 };
  }
  const dayStart = startOfDay(day);
  const busy = await loadDayBusy({ unitId: options.unitId, dayStart });

  let staffWorkWeekJson: unknown = undefined;
  if (options.staffMemberId) {
    const staff = await prisma.staffMember.findFirst({
      where: {
        id: options.staffMemberId,
        organizationId: options.organizationId,
        role: "STAFF",
        unitId: options.unitId,
      },
      select: { workWeekJson: true },
    });
    if (!staff) {
      return {
        ok: false,
        message: "Profissional inválido nesta unidade.",
        status: 400,
      };
    }
    staffWorkWeekJson = staff.workWeekJson;
  }

  const suggestions = suggestEncaixeGaps({
    dayStart,
    durationMinutes: resolved.durationMinutes,
    appointments: busy,
    staffMemberId: options.staffMemberId,
    staffWorkWeekJson,
  });

  return {
    ok: true,
    durationMinutes: resolved.durationMinutes,
    suggestions,
  };
}

export async function createEncaixeBooking(
  input: CreateEncaixeInput,
): Promise<CreateEncaixeResult> {
  const unit = await prisma.barbershopUnit.findFirst({
    where: {
      id: input.unitId,
      isActive: true,
      organizationId: input.organizationId,
    },
    select: { id: true },
  });
  if (!unit) {
    return { ok: false, message: "Unidade inválida.", status: 400 };
  }

  const resolved = await resolveServiceDuration({
    organizationId: input.organizationId,
    unitId: input.unitId,
    serviceId: input.serviceId,
  });
  if (!resolved.ok) return resolved;

  const day = parseISO(input.date);
  if (Number.isNaN(day.getTime())) {
    return { ok: false, message: "Data inválida.", status: 400 };
  }
  if (!/^\d{2}:\d{2}$/.test(input.time)) {
    return { ok: false, message: "Horário inválido.", status: 400 };
  }

  const startsAt = getSlotStart(day, input.time);
  const endsAt = getSlotEnd(startsAt, resolved.durationMinutes);

  if (startsAt.getDay() === 0) {
    return {
      ok: false,
      message: "A barbearia não abre ao domingo.",
      status: 400,
    };
  }
  if (!isSlotWithinBusinessHours(startsAt, resolved.durationMinutes)) {
    return {
      ok: false,
      message: "Horário fora do expediente da barbearia.",
      status: 400,
    };
  }

  let assignedStaff: {
    id: string;
    email: string;
    displayName: string | null;
  } | null = null;

  if (input.staffMemberId) {
    const staff = await prisma.staffMember.findFirst({
      where: {
        id: input.staffMemberId,
        organizationId: input.organizationId,
        role: "STAFF",
        unitId: input.unitId,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        workWeekJson: true,
      },
    });
    if (!staff) {
      return {
        ok: false,
        message: "Profissional inválido nesta unidade.",
        status: 400,
      };
    }
    if (
      !isSlotWithinStaffSchedule(
        staff.workWeekJson,
        startsAt,
        resolved.durationMinutes,
      )
    ) {
      return {
        ok: false,
        message: "Horário fora do expediente deste profissional.",
        status: 400,
      };
    }
    assignedStaff = {
      id: staff.id,
      email: staff.email,
      displayName: staff.displayName,
    };
  }

  const dayStart = startOfDay(day);
  const busy = await loadDayBusy({ unitId: input.unitId, dayStart });
  const conflicts = findEncaixeConflicts(
    busy,
    startsAt,
    endsAt,
    assignedStaff?.id ?? null,
  );

  if (conflicts.length > 0 && !input.force) {
    const preview = suggestEncaixeGaps({
      dayStart,
      durationMinutes: resolved.durationMinutes,
      appointments: busy,
      staffMemberId: assignedStaff?.id,
    });
    const names = conflicts
      .map((c) => `${c.clientName} (${c.startsAtLabel})`)
      .join(", ");
    return {
      ok: false,
      message: `Isso atravessa horário(s) já marcado(s): ${names}. Confirme para atender mesmo assim.`,
      status: 409,
      conflicts,
      suggestions: preview,
    };
  }

  const phoneStored = formatBrPhoneNational(input.customerPhone);
  const noteParts = [
    input.force && conflicts.length > 0 ? "[Encaixe forçado]" : null,
    input.notes?.trim() || null,
  ].filter(Boolean);

  const appointment = await prisma.appointment.create({
    data: {
      clientName: input.customerName.trim(),
      clientPhone: phoneStored,
      clientEmail: input.customerEmail?.trim() || null,
      notes: noteParts.length ? noteParts.join(" ") : null,
      startsAt,
      endsAt,
      serviceId: input.serviceId,
      unitId: input.unitId,
      staffMemberId: assignedStaff?.id ?? null,
      bookedWithoutStaffPreference: !input.staffMemberId,
      clientManageToken: randomUUID(),
      bookingSource: ENCAIXE_BOOKING_SOURCE,
      items: {
        create: [
          {
            serviceId: resolved.service.id,
            price: resolved.price,
            durationMinutes: resolved.durationMinutes,
            sortOrder: 0,
          },
        ],
      },
    },
    include: { service: true },
  });

  if (assignedStaff) {
    void notifyBarberNewAssignment({
      staffMemberId: assignedStaff.id,
      barberEmail: assignedStaff.email,
      barberDisplayName: assignedStaff.displayName,
      clientName: appointment.clientName,
      clientPhone: appointment.clientPhone,
      clientEmail: appointment.clientEmail,
      serviceName: appointment.service.name,
      startsAt: appointment.startsAt,
      notes: appointment.notes,
    });
  }

  return {
    ok: true,
    appointment,
    forced: Boolean(input.force && conflicts.length > 0),
    conflicts,
  };
}

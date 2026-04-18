import "server-only";

import { parseISO } from "date-fns";
import type { Service } from "@prisma/client";

import { buildAppointmentSlotConflictWhere } from "@/lib/appointment-slot-conflict";
import { prisma } from "@/lib/prisma";
import {
  getSlotEnd,
  getSlotStart,
  isSlotWithinBusinessHours,
} from "@/lib/utils";
import { isSlotWithinStaffSchedule } from "@/lib/work-week";

export type AssignedStaffForNotify = {
  id: string;
  email: string;
  displayName: string | null;
};

/**
 * Valida data/hora, expediente, profissional e conflitos — usado em `POST /api/appointments` e remarcação pública.
 */
export async function assertPublicBookingSlot(options: {
  service: Pick<Service, "durationMinutes">;
  dateStr: string;
  timeStr: string;
  unitId: string | null;
  staffMemberId?: string | undefined;
  excludeAppointmentId?: string;
}): Promise<
  | {
      ok: true;
      startsAt: Date;
      endsAt: Date;
      assignedStaff: AssignedStaffForNotify | null;
    }
  | { ok: false; message: string; status: number }
> {
  const {
    service,
    dateStr,
    timeStr,
    unitId,
    staffMemberId,
    excludeAppointmentId,
  } = options;

  const day = parseISO(dateStr);
  if (Number.isNaN(day.getTime())) {
    return { ok: false, message: "Data inválida.", status: 400 };
  }

  const startsAt = getSlotStart(day, timeStr);
  const endsAt = getSlotEnd(startsAt, service.durationMinutes);

  if (startsAt.getDay() === 0) {
    return {
      ok: false,
      message: "A barbearia não abre ao domingo.",
      status: 400,
    };
  }

  if (!isSlotWithinBusinessHours(startsAt, service.durationMinutes)) {
    return {
      ok: false,
      message: "Horário fora do expediente para este serviço.",
      status: 400,
    };
  }

  let assignedStaff: AssignedStaffForNotify | null = null;

  if (staffMemberId) {
    if (!unitId) {
      return {
        ok: false,
        message: "Não é possível escolher profissional sem unidade configurada.",
        status: 400,
      };
    }
    const staff = await prisma.staffMember.findFirst({
      where: {
        id: staffMemberId,
        role: "STAFF",
        unitId: unitId,
      },
      select: { id: true, email: true, displayName: true, workWeekJson: true },
    });
    if (!staff) {
      return {
        ok: false,
        message: "Profissional inválido ou não pertence à unidade de agendamento.",
        status: 400,
      };
    }
    assignedStaff = {
      id: staff.id,
      email: staff.email,
      displayName: staff.displayName,
    };
    if (
      !isSlotWithinStaffSchedule(
        staff.workWeekJson,
        startsAt,
        service.durationMinutes,
      )
    ) {
      return {
        ok: false,
        message: "Horário fora do expediente deste profissional.",
        status: 400,
      };
    }
  }

  const conflict = await prisma.appointment.findFirst({
    where: buildAppointmentSlotConflictWhere({
      unitId: unitId,
      rangeStart: startsAt,
      rangeEnd: endsAt,
      ...(assignedStaff
        ? { assignedStaffMemberId: assignedStaff.id }
        : {}),
      ...(excludeAppointmentId
        ? { excludeAppointmentId }
        : {}),
    }),
    select: { id: true },
  });

  if (conflict) {
    return {
      ok: false,
      message: "Esse horário já foi reservado.",
      status: 409,
    };
  }

  return { ok: true, startsAt, endsAt, assignedStaff };
}

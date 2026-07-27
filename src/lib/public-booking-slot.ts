import "server-only";

import { parseISO, startOfDay } from "date-fns";
import type { Service } from "@prisma/client";

import { buildAppointmentSlotConflictWhere } from "@/lib/appointment-slot-conflict";
import {
  loadDayAppointments,
  loadUnitStaffRoster,
  pickStaffForSlot,
} from "@/lib/booking-availability";
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
 * Com duração total (vários serviços), exige bloco contínuo livre.
 * Sem `staffMemberId`, atribui automaticamente um profissional livre na equipe (se existir).
 */
export async function assertPublicBookingSlot(options: {
  service: Pick<Service, "durationMinutes">;
  dateStr: string;
  timeStr: string;
  unitId: string | null;
  staffMemberId?: string | undefined;
  excludeAppointmentId?: string;
  organizationId?: string;
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
    organizationId,
  } = options;

  const day = parseISO(dateStr);
  if (Number.isNaN(day.getTime())) {
    return { ok: false, message: "Data inválida.", status: 400 };
  }

  const durationMinutes = service.durationMinutes;
  const startsAt = getSlotStart(day, timeStr);
  const endsAt = getSlotEnd(startsAt, durationMinutes);

  if (startsAt.getDay() === 0) {
    return {
      ok: false,
      message: "A barbearia não abre ao domingo.",
      status: 400,
    };
  }

  if (!isSlotWithinBusinessHours(startsAt, durationMinutes)) {
    return {
      ok: false,
      message:
        "Este horário não comporta a duração total dos serviços escolhidos (fora do expediente).",
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
        ...(organizationId ? { organizationId } : {}),
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
    if (
      !isSlotWithinStaffSchedule(staff.workWeekJson, startsAt, durationMinutes)
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
  } else if (unitId && organizationId) {
    const [roster, appointments] = await Promise.all([
      loadUnitStaffRoster({ organizationId, unitId }),
      loadDayAppointments({
        unitId,
        dayStart: startOfDay(day),
        excludeAppointmentId,
      }),
    ]);

    if (roster.length > 0) {
      const picked = pickStaffForSlot({
        staffRoster: roster,
        appointments,
        slotStart: startsAt,
        durationMinutes,
      });
      if (!picked) {
        return {
          ok: false,
          message:
            "Nenhum profissional livre para a duração total neste horário. Escolha outro horário.",
          status: 409,
        };
      }
      const full = await prisma.staffMember.findFirst({
        where: { id: picked.id },
        select: { id: true, email: true, displayName: true },
      });
      if (full) {
        assignedStaff = full;
      }
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
      message: "Esse horário já foi reservado para a duração necessária.",
      status: 409,
    };
  }

  return { ok: true, startsAt, endsAt, assignedStaff };
}

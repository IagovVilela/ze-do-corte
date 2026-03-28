import type { Prisma } from "@prisma/client";

/**
 * Conflito de horário para novos agendamentos.
 * Sem `assignedStaffMemberId`: qualquer agendamento na unidade no intervalo bloqueia (comportamento legado).
 * Com `assignedStaffMemberId`: bloqueia se houver sobreposição com agendamento desse profissional ou ainda sem profissional (`null`).
 */
export function buildAppointmentSlotConflictWhere(args: {
  unitId: string | null;
  rangeStart: Date;
  rangeEnd: Date;
  assignedStaffMemberId?: string;
}): Prisma.AppointmentWhereInput {
  const { unitId, rangeStart, rangeEnd, assignedStaffMemberId } = args;
  const base: Prisma.AppointmentWhereInput = {
    status: { in: ["CONFIRMED", "COMPLETED"] },
    startsAt: { lt: rangeEnd },
    endsAt: { gt: rangeStart },
  };
  if (unitId) {
    base.unitId = unitId;
  }
  if (assignedStaffMemberId) {
    base.OR = [
      { staffMemberId: assignedStaffMemberId },
      { staffMemberId: null },
    ];
  }
  return base;
}

export function appointmentOverlapsSlot(
  appt: { startsAt: Date; endsAt: Date; staffMemberId: string | null },
  slotStart: Date,
  slotEnd: Date,
  bookWithStaffId?: string | null,
): boolean {
  const timeOverlap =
    appt.startsAt.getTime() < slotEnd.getTime() &&
    appt.endsAt.getTime() > slotStart.getTime();
  if (!timeOverlap) return false;
  if (!bookWithStaffId) return true;
  return appt.staffMemberId === bookWithStaffId || appt.staffMemberId === null;
}

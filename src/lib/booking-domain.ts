import "server-only";

import { randomUUID } from "node:crypto";

import type { Appointment, Service } from "@prisma/client";

import { notifyBarberNewAssignment } from "@/lib/notify-barber-booking";
import { assertPublicBookingSlot } from "@/lib/public-booking-slot";
import { prisma } from "@/lib/prisma";
import { formatBrPhoneNational, brPhoneDigits } from "@/lib/br-phone-format";

export type CreateBookingInput = {
  organizationId: string;
  unitId: string;
  serviceId: string;
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  notes?: string | null;
  staffMemberId?: string;
  bookingSource?: string;
  /** Se true, tenta consumir crédito do clube ativo do mesmo telefone. */
  useClubCredit?: boolean;
};

export type CreateBookingResult =
  | { ok: true; appointment: Appointment & { service: Service } }
  | { ok: false; message: string; status: number };

/** Telefone WhatsApp (só dígitos) → formato nacional BR para comparação/persistência. */
export function waPhoneToStored(waDigits: string): string {
  return formatBrPhoneNational(waDigits);
}

/** Normaliza entrada Meta (pode vir sem 55) para E.164 digits. */
export function normalizeWaUserPhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.length <= 11 && !d.startsWith("55")) {
    d = `55${d}`;
  }
  return d;
}

export async function createPublicBooking(
  input: CreateBookingInput,
): Promise<CreateBookingResult> {
  const unit = await prisma.barbershopUnit.findFirst({
    where: {
      id: input.unitId,
      isActive: true,
      organizationId: input.organizationId,
    },
    select: { id: true, organizationId: true },
  });
  if (!unit) {
    return { ok: false, message: "Unidade inválida.", status: 400 };
  }

  const service = await prisma.service.findFirst({
    where: {
      id: input.serviceId,
      unit: { organizationId: input.organizationId },
    },
    include: { unitOverrides: true },
  });
  if (!service) {
    return { ok: false, message: "Serviço inválido.", status: 404 };
  }

  const unitOverride = service.unitOverrides.find((o) => o.unitId === input.unitId);
  const isActive = unitOverride ? unitOverride.isActive : service.isActive;
  const durationMinutes =
    unitOverride && unitOverride.durationMinutes !== null
      ? unitOverride.durationMinutes
      : service.durationMinutes;

  if (!isActive) {
    return {
      ok: false,
      message: "Serviço indisponível nesta unidade.",
      status: 404,
    };
  }
  if (service.unitId !== input.unitId && !unitOverride) {
    return {
      ok: false,
      message: "Este serviço não está disponível na unidade selecionada.",
      status: 400,
    };
  }

  const phoneStored = formatBrPhoneNational(input.customerPhone);

  const slot = await assertPublicBookingSlot({
    service: { ...service, durationMinutes },
    dateStr: input.date,
    timeStr: input.time,
    unitId: input.unitId,
    staffMemberId: input.staffMemberId,
    organizationId: input.organizationId,
  });

  if (!slot.ok) {
    return { ok: false, message: slot.message, status: slot.status };
  }

  const { startsAt, endsAt, assignedStaff } = slot;

  let usedSubscriptionId: string | null = null;
  if (input.useClubCredit !== false) {
    const club = await findActiveClubForBooking({
      organizationId: input.organizationId,
      clientPhone: phoneStored,
      serviceId: input.serviceId,
    });
    if (club) {
      usedSubscriptionId = club.id;
    }
  }

  const appointment = await prisma.$transaction(async (tx) => {
    const created = await tx.appointment.create({
      data: {
        clientName: input.customerName.trim(),
        clientPhone: phoneStored,
        clientEmail: input.customerEmail?.trim() || null,
        notes: input.notes?.trim() || null,
        startsAt,
        endsAt,
        serviceId: input.serviceId,
        unitId: input.unitId,
        staffMemberId: assignedStaff?.id ?? null,
        clientManageToken: randomUUID(),
        bookingSource: input.bookingSource ?? "site",
        usedSubscriptionId,
        ...(usedSubscriptionId
          ? {
              paymentStatus: "PAID" as const,
              paidAt: new Date(),
              paymentMethod: "Clube",
              amountPaid: 0,
            }
          : {}),
      },
      include: { service: true },
    });
    if (usedSubscriptionId) {
      await tx.clientSubscription.update({
        where: { id: usedSubscriptionId },
        data: { visitsUsed: { increment: 1 } },
      });
    }
    return created;
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

  return { ok: true, appointment };
}

export async function cancelAppointmentById(options: {
  appointmentId: string;
  organizationId: string;
}): Promise<CreateBookingResult> {
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: options.appointmentId,
      status: "CONFIRMED",
      unit: { organizationId: options.organizationId },
    },
    include: { service: true },
  });
  if (!appointment) {
    return { ok: false, message: "Agendamento não encontrado.", status: 404 };
  }
  if (appointment.startsAt.getTime() <= Date.now()) {
    return {
      ok: false,
      message: "O horário deste agendamento já passou.",
      status: 409,
    };
  }
  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: "CANCELLED" },
    include: { service: true },
  });
  return { ok: true, appointment: updated };
}

export async function rescheduleAppointmentById(options: {
  appointmentId: string;
  organizationId: string;
  date: string;
  time: string;
}): Promise<CreateBookingResult> {
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: options.appointmentId,
      status: "CONFIRMED",
      unit: { organizationId: options.organizationId },
    },
    include: { service: true },
  });
  if (!appointment) {
    return { ok: false, message: "Agendamento não encontrado.", status: 404 };
  }
  if (appointment.startsAt.getTime() <= Date.now()) {
    return {
      ok: false,
      message: "O horário deste agendamento já passou.",
      status: 409,
    };
  }
  if (!appointment.unitId) {
    return { ok: false, message: "Unidade inválida.", status: 400 };
  }

  const slot = await assertPublicBookingSlot({
    service: appointment.service,
    dateStr: options.date,
    timeStr: options.time,
    unitId: appointment.unitId,
    staffMemberId: appointment.staffMemberId ?? undefined,
    excludeAppointmentId: appointment.id,
    organizationId: options.organizationId,
  });
  if (!slot.ok) {
    return { ok: false, message: slot.message, status: slot.status };
  }

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      staffMemberId: slot.assignedStaff?.id ?? appointment.staffMemberId,
    },
    include: { service: true },
  });
  return { ok: true, appointment: updated };
}

async function findActiveClubForBooking(options: {
  organizationId: string;
  clientPhone: string;
  serviceId: string;
}) {
  const phoneDigits = brPhoneDigits(options.clientPhone);
  const now = new Date();
  const candidates = await prisma.clientSubscription.findMany({
    where: {
      organizationId: options.organizationId,
      status: "ACTIVE",
      currentPeriodEnd: { gt: now },
      plan: {
        isActive: true,
        services: { some: { serviceId: options.serviceId } },
      },
    },
    include: {
      plan: { select: { visitsIncluded: true } },
    },
    orderBy: { currentPeriodEnd: "asc" },
    take: 20,
  });

  for (const sub of candidates) {
    if (brPhoneDigits(sub.clientPhone) !== phoneDigits) continue;
    if (
      sub.plan.visitsIncluded != null &&
      sub.visitsUsed >= sub.plan.visitsIncluded
    ) {
      continue;
    }
    return sub;
  }
  return null;
}

/** Próximos confirmados do telefone nesta org (match por dígitos nacionais). */
export async function listUpcomingByPhone(options: {
  organizationId: string;
  waUserPhone: string;
  take?: number;
}) {
  const national = brPhoneDigits(options.waUserPhone);
  const rows = await prisma.appointment.findMany({
    where: {
      status: "CONFIRMED",
      startsAt: { gt: new Date() },
      unit: { organizationId: options.organizationId },
    },
    include: { service: true, unit: { select: { name: true } } },
    orderBy: { startsAt: "asc" },
    take: 40,
  });
  return rows
    .filter((r) => brPhoneDigits(r.clientPhone) === national)
    .slice(0, options.take ?? 5);
}

export { brPhoneDigits };

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  notifyClientAppointmentChange,
  notifyStaffAppointmentChange,
  notifyStaffForAppointmentId,
} from "@/lib/appointment-change-notify";
import { isClientManageTokenFormat } from "@/lib/client-manage-token";
import { getBarbersForBooking } from "@/lib/data";
import { notifyBarberNewAssignment } from "@/lib/notify-barber-booking";
import { assertPublicBookingSlot } from "@/lib/public-booking-slot";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel") }),
  z.object({
    action: z.literal("reschedule"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido."),
    /** ID do barbeiro; `null` = qualquer disponível; omitido = mantém o atual. */
    staffMemberId: z.union([z.string().min(1), z.null()]).optional(),
  }),
]);

type RouteContext = { params: Promise<{ token: string }> };

function manageBlocked(
  row: { status: string; startsAt: Date; clientManageToken: string | null },
): string | null {
  if (!row.clientManageToken) {
    return "Este agendamento não possui link de gestão (reservas antigas).";
  }
  if (row.status !== "CONFIRMED") {
    return row.status === "CANCELLED"
      ? "Este agendamento já foi cancelado."
      : "Este agendamento não pode ser alterado pelo link.";
  }
  if (row.startsAt.getTime() <= Date.now()) {
    return "O horário deste agendamento já passou.";
  }
  return null;
}

async function resolveOrganizationId(appointment: {
  unitId: string | null;
  serviceId: string;
}): Promise<string | null> {
  if (appointment.unitId) {
    const unit = await prisma.barbershopUnit.findUnique({
      where: { id: appointment.unitId },
      select: { organizationId: true },
    });
    return unit?.organizationId ?? null;
  }
  const service = await prisma.service.findUnique({
    where: { id: appointment.serviceId },
    select: { unit: { select: { organizationId: true } } },
  });
  return service?.unit.organizationId ?? null;
}

export async function GET(_request: Request, context: RouteContext) {
  const { token: raw } = await context.params;
  const token = decodeURIComponent(raw).trim();
  if (!isClientManageTokenFormat(token)) {
    return NextResponse.json({ message: "Link inválido." }, { status: 404 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { clientManageToken: token },
    include: {
      service: {
        include: {
          unit: {
            select: {
              organization: { select: { id: true, slug: true, name: true } },
            },
          },
        },
      },
      unit: {
        select: {
          name: true,
          organization: { select: { id: true, slug: true, name: true } },
        },
      },
      staffMember: { select: { displayName: true } },
      review: { select: { id: true, rating: true } },
    },
  });

  if (!appointment) {
    return NextResponse.json({ message: "Reserva não encontrada." }, { status: 404 });
  }

  const blocked = manageBlocked(appointment);
  const pastOrDone =
    appointment.status === "COMPLETED" ||
    (appointment.status === "CONFIRMED" &&
      appointment.startsAt.getTime() <= Date.now());
  const canReview =
    pastOrDone &&
    appointment.status !== "CANCELLED" &&
    !appointment.review;

  const org =
    appointment.unit?.organization ?? appointment.service.unit.organization;

  const barbersForUnit =
    org?.id && blocked === null
      ? (await getBarbersForBooking(org.id))
          .filter(
            (b) =>
              !appointment.unitId ||
              !b.unitId ||
              b.unitId === appointment.unitId,
          )
          .map((b) => ({
            id: b.id,
            name: b.name,
            imageUrl: b.imageUrl,
          }))
      : [];

  return NextResponse.json({
    appointment: {
      id: appointment.id,
      status: appointment.status,
      clientName: appointment.clientName,
      clientPhone: appointment.clientPhone,
      startsAt: appointment.startsAt.toISOString(),
      endsAt: appointment.endsAt.toISOString(),
      notes: appointment.notes,
      service: {
        id: appointment.service.id,
        name: appointment.service.name,
        durationMinutes: Math.max(
          1,
          Math.round(
            (appointment.endsAt.getTime() - appointment.startsAt.getTime()) /
              60_000,
          ),
        ),
        price: Number(appointment.service.price),
      },
      unitId: appointment.unitId,
      unitName: appointment.unit?.name ?? null,
      organizationSlug: org?.slug ?? null,
      organizationName: org?.name ?? null,
      staffMemberId: appointment.staffMemberId,
      staffDisplayName: appointment.staffMember?.displayName?.trim() || null,
      barbers: barbersForUnit,
      canManage: blocked === null,
      manageBlockedReason: blocked,
      canReview,
      hasReview: Boolean(appointment.review),
      reviewRating: appointment.review?.rating ?? null,
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { token: raw } = await context.params;
  const token = decodeURIComponent(raw).trim();
  if (!isClientManageTokenFormat(token)) {
    return NextResponse.json({ message: "Link inválido." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const appointment = await prisma.appointment.findUnique({
    where: { clientManageToken: token },
    include: { service: true },
  });

  if (!appointment) {
    return NextResponse.json({ message: "Reserva não encontrada." }, { status: 404 });
  }

  const blocked = manageBlocked(appointment);
  if (blocked) {
    return NextResponse.json({ message: blocked }, { status: 409 });
  }

  const organizationId = await resolveOrganizationId(appointment);
  if (!organizationId) {
    return NextResponse.json(
      { message: "Organização não encontrada." },
      { status: 400 },
    );
  }

  if (parsed.data.action === "cancel") {
    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: "CANCELLED" },
      include: { service: true },
    });
    void notifyClientAppointmentChange({
      organizationId,
      appointment: updated,
      kind: "cancelled",
      actor: "client",
    });
    void notifyStaffForAppointmentId(updated.id, "cancelled", "client");
    return NextResponse.json({ ok: true, status: "CANCELLED" });
  }

  const bookedDurationMinutes = Math.max(
    1,
    Math.round(
      (appointment.endsAt.getTime() - appointment.startsAt.getTime()) / 60_000,
    ),
  );

  const requestedStaffId =
    parsed.data.staffMemberId === undefined
      ? (appointment.staffMemberId ?? undefined)
      : parsed.data.staffMemberId === null
        ? undefined
        : parsed.data.staffMemberId;
  const withoutStaffPreference = parsed.data.staffMemberId === null;

  const slot = await assertPublicBookingSlot({
    service: { durationMinutes: bookedDurationMinutes },
    dateStr: parsed.data.date,
    timeStr: parsed.data.time,
    unitId: appointment.unitId,
    staffMemberId: requestedStaffId,
    excludeAppointmentId: appointment.id,
    organizationId,
  });

  if (!slot.ok) {
    return NextResponse.json(
      { message: slot.message },
      { status: slot.status },
    );
  }

  const previousStartsAt = appointment.startsAt;
  const previousStaffId = appointment.staffMemberId;
  const nextStaffId = slot.assignedStaff?.id ?? null;

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      staffMemberId: nextStaffId,
      ...(parsed.data.staffMemberId !== undefined
        ? { bookedWithoutStaffPreference: withoutStaffPreference }
        : {}),
    },
    include: { service: true },
  });

  void notifyClientAppointmentChange({
    organizationId,
    appointment: updated,
    kind: "rescheduled",
    actor: "client",
    previousStartsAt,
  });

  const staffChanged = previousStaffId !== nextStaffId;

  if (staffChanged && previousStaffId) {
    const previousStaff = await prisma.staffMember.findUnique({
      where: { id: previousStaffId },
      select: { id: true, email: true, displayName: true },
    });
    if (previousStaff) {
      void notifyStaffAppointmentChange({
        staffMemberId: previousStaff.id,
        barberEmail: previousStaff.email,
        barberDisplayName: previousStaff.displayName,
        clientName: appointment.clientName,
        clientPhone: appointment.clientPhone,
        clientEmail: appointment.clientEmail,
        serviceName: appointment.service.name,
        startsAt: previousStartsAt,
        kind: "cancelled",
        actor: "client",
      });
    }
  }

  if (
    slot.assignedStaff &&
    slot.assignedStaff.id !== previousStaffId
  ) {
    void notifyBarberNewAssignment({
      staffMemberId: slot.assignedStaff.id,
      barberEmail: slot.assignedStaff.email,
      barberDisplayName: slot.assignedStaff.displayName,
      clientName: appointment.clientName,
      clientPhone: appointment.clientPhone,
      clientEmail: appointment.clientEmail,
      serviceName: appointment.service.name,
      startsAt: slot.startsAt,
      notes: appointment.notes,
    });
  } else if (!staffChanged) {
    void notifyStaffForAppointmentId(
      updated.id,
      "rescheduled",
      "client",
      previousStartsAt,
    );
  }

  return NextResponse.json({
    ok: true,
    startsAt: slot.startsAt.toISOString(),
    endsAt: slot.endsAt.toISOString(),
    staffMemberId: nextStaffId,
  });
}

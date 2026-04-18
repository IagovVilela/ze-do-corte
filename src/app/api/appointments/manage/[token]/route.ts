import { NextResponse } from "next/server";
import { z } from "zod";

import { isClientManageTokenFormat } from "@/lib/client-manage-token";
import { assertPublicBookingSlot } from "@/lib/public-booking-slot";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel") }),
  z.object({
    action: z.literal("reschedule"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido."),
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

export async function GET(_request: Request, context: RouteContext) {
  const { token: raw } = await context.params;
  const token = decodeURIComponent(raw).trim();
  if (!isClientManageTokenFormat(token)) {
    return NextResponse.json({ message: "Link inválido." }, { status: 404 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { clientManageToken: token },
    include: {
      service: true,
      unit: { select: { name: true } },
      staffMember: { select: { displayName: true } },
    },
  });

  if (!appointment) {
    return NextResponse.json({ message: "Reserva não encontrada." }, { status: 404 });
  }

  const blocked = manageBlocked(appointment);

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
        durationMinutes: appointment.service.durationMinutes,
        price: Number(appointment.service.price),
      },
      unitName: appointment.unit?.name ?? null,
      staffMemberId: appointment.staffMemberId,
      staffDisplayName: appointment.staffMember?.displayName?.trim() || null,
      canManage: blocked === null,
      manageBlockedReason: blocked,
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

  if (parsed.data.action === "cancel") {
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: "CANCELLED" },
    });
    return NextResponse.json({ ok: true, status: "CANCELLED" });
  }

  const slot = await assertPublicBookingSlot({
    service: appointment.service,
    dateStr: parsed.data.date,
    timeStr: parsed.data.time,
    unitId: appointment.unitId,
    staffMemberId: appointment.staffMemberId ?? undefined,
    excludeAppointmentId: appointment.id,
  });

  if (!slot.ok) {
    return NextResponse.json(
      { message: slot.message },
      { status: slot.status },
    );
  }

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
    },
  });

  return NextResponse.json({
    ok: true,
    startsAt: slot.startsAt.toISOString(),
    endsAt: slot.endsAt.toISOString(),
  });
}

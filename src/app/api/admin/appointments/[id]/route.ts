import type { StaffRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { notifyBarberNewAssignment } from "@/lib/notify-barber-booking";
import { prisma } from "@/lib/prisma";
import { appointmentScopeWhere } from "@/lib/staff-access";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  staffMemberId: z.union([z.string().min(1), z.null()]),
});

type RouteContext = { params: Promise<{ id: string }> };

function canAssignAppointments(role: StaffRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  if (!canAssignAppointments(auth.access.role)) {
    return NextResponse.json(
      { message: "Apenas proprietário ou administrador pode atribuir profissional." },
      { status: 403 },
    );
  }

  const { id } = await context.params;

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

  const appointment = await prisma.appointment.findFirst({
    where: {
      id,
      ...appointmentScopeWhere(auth.access),
    },
    select: {
      id: true,
      unitId: true,
      staffMemberId: true,
      clientName: true,
      clientPhone: true,
      clientEmail: true,
      notes: true,
      startsAt: true,
      service: { select: { name: true } },
    },
  });

  if (!appointment) {
    return NextResponse.json(
      { message: "Agendamento não encontrado." },
      { status: 404 },
    );
  }

  const nextStaffId = parsed.data.staffMemberId;
  const previousStaffId = appointment.staffMemberId;

  if (nextStaffId === null) {
    await prisma.appointment.update({
      where: { id },
      data: { staffMemberId: null },
    });
    return NextResponse.json({ ok: true });
  }

  const staff = await prisma.staffMember.findFirst({
    where: {
      id: nextStaffId,
      role: "STAFF",
    },
    select: { id: true, unitId: true, email: true, displayName: true },
  });

  if (!staff) {
    return NextResponse.json(
      { message: "Profissional inválido ou não é funcionário." },
      { status: 400 },
    );
  }

  if (
    appointment.unitId !== null &&
    staff.unitId !== null &&
    staff.unitId !== appointment.unitId
  ) {
    return NextResponse.json(
      { message: "O profissional pertence a outra unidade que este agendamento." },
      { status: 400 },
    );
  }

  if (appointment.unitId !== null && staff.unitId === null) {
    return NextResponse.json(
      { message: "O profissional precisa estar vinculado à mesma unidade do agendamento." },
      { status: 400 },
    );
  }

  await prisma.appointment.update({
    where: { id },
    data: { staffMemberId: staff.id },
  });

  if (nextStaffId !== previousStaffId) {
    void notifyBarberNewAssignment({
      barberEmail: staff.email,
      barberDisplayName: staff.displayName,
      clientName: appointment.clientName,
      clientPhone: appointment.clientPhone,
      clientEmail: appointment.clientEmail,
      serviceName: appointment.service.name,
      startsAt: appointment.startsAt,
      notes: appointment.notes,
    });
  }

  return NextResponse.json({ ok: true });
}

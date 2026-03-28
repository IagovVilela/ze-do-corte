import type { Prisma, StaffRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { notifyBarberNewAssignment } from "@/lib/notify-barber-booking";
import { prisma } from "@/lib/prisma";
import { appointmentScopeWhere } from "@/lib/staff-access";
import { isSlotWithinStaffSchedule } from "@/lib/work-week";

export const dynamic = "force-dynamic";

const patchSchema = z
  .object({
    staffMemberId: z.union([z.string().min(1), z.null()]).optional(),
    paidAt: z.union([z.iso.datetime(), z.null()]).optional(),
    paymentMethod: z.string().trim().max(32).nullable().optional(),
  })
  .refine(
    (d) =>
      d.staffMemberId !== undefined ||
      d.paidAt !== undefined ||
      d.paymentMethod !== undefined,
    { message: "Nada para atualizar." },
  );

type RouteContext = { params: Promise<{ id: string }> };

function canAssignAppointments(role: StaffRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

function canRecordPayment(role: StaffRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

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

  if (
    parsed.data.staffMemberId !== undefined &&
    !canAssignAppointments(auth.access.role)
  ) {
    return NextResponse.json(
      { message: "Apenas proprietário ou administrador pode atribuir profissional." },
      { status: 403 },
    );
  }

  const touchesPayment =
    parsed.data.paidAt !== undefined || parsed.data.paymentMethod !== undefined;
  if (touchesPayment && !canRecordPayment(auth.access.role)) {
    return NextResponse.json(
      { message: "Apenas proprietário ou administrador pode registar pagamento." },
      { status: 403 },
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
      service: { select: { name: true, durationMinutes: true } },
    },
  });

  if (!appointment) {
    return NextResponse.json(
      { message: "Agendamento não encontrado." },
      { status: 404 },
    );
  }

  const updateData: Prisma.AppointmentUncheckedUpdateInput = {};
  let notifyPayload: Parameters<typeof notifyBarberNewAssignment>[0] | null =
    null;

  if (parsed.data.paidAt !== undefined) {
    if (parsed.data.paidAt === null) {
      updateData.paidAt = null;
      updateData.paymentMethod = null;
    } else {
      updateData.paidAt = new Date(parsed.data.paidAt);
      if (parsed.data.paymentMethod !== undefined) {
        updateData.paymentMethod = parsed.data.paymentMethod;
      }
    }
  } else if (parsed.data.paymentMethod !== undefined) {
    updateData.paymentMethod = parsed.data.paymentMethod;
  }

  if (parsed.data.staffMemberId !== undefined) {
    const nextStaffId = parsed.data.staffMemberId;
    const previousStaffId = appointment.staffMemberId;

    if (nextStaffId === null) {
      updateData.staffMemberId = null;
    } else {
      const staff = await prisma.staffMember.findFirst({
        where: {
          id: nextStaffId,
          role: "STAFF",
        },
        select: {
          id: true,
          unitId: true,
          email: true,
          displayName: true,
          workWeekJson: true,
        },
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

      if (
        !isSlotWithinStaffSchedule(
          staff.workWeekJson,
          appointment.startsAt,
          appointment.service.durationMinutes,
        )
      ) {
        return NextResponse.json(
          { message: "Este horário está fora do expediente configurado pelo profissional." },
          { status: 400 },
        );
      }

      updateData.staffMemberId = staff.id;

      if (nextStaffId !== previousStaffId) {
        notifyPayload = {
          barberEmail: staff.email,
          barberDisplayName: staff.displayName,
          clientName: appointment.clientName,
          clientPhone: appointment.clientPhone,
          clientEmail: appointment.clientEmail,
          serviceName: appointment.service.name,
          startsAt: appointment.startsAt,
          notes: appointment.notes,
        };
      }
    }
  }

  await prisma.appointment.update({
    where: { id },
    data: updateData,
  });

  if (notifyPayload) {
    void notifyBarberNewAssignment(notifyPayload);
  }

  return NextResponse.json({ ok: true });
}

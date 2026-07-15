import type { Prisma, StaffRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import {
  notifyClientAppointmentChange,
  notifyStaffForAppointmentId,
} from "@/lib/appointment-change-notify";
import { notifyBarberNewAssignment } from "@/lib/notify-barber-booking";
import { assertPublicBookingSlot } from "@/lib/public-booking-slot";
import { prisma } from "@/lib/prisma";
import { appointmentScopeWhere } from "@/lib/staff-access";
import { isSlotWithinStaffSchedule } from "@/lib/work-week";

export const dynamic = "force-dynamic";

const patchSchema = z
  .object({
    staffMemberId: z.union([z.string().min(1), z.null()]).optional(),
    paidAt: z.union([z.iso.datetime(), z.null()]).optional(),
    paymentMethod: z.string().trim().max(32).nullable().optional(),
    amountPaid: z.union([z.number().nonnegative(), z.null()]).optional(),
    status: z.enum(["CONFIRMED", "COMPLETED", "CANCELLED"]).optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
      .optional(),
    time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Horário inválido.")
      .optional(),
  })
  .refine(
    (d) =>
      d.staffMemberId !== undefined ||
      d.paidAt !== undefined ||
      d.paymentMethod !== undefined ||
      d.amountPaid !== undefined ||
      d.status !== undefined ||
      (d.date !== undefined && d.time !== undefined),
    { message: "Nada para atualizar." },
  )
  .refine(
    (d) =>
      (d.date === undefined && d.time === undefined) ||
      (d.date !== undefined && d.time !== undefined),
    { message: "Informe data e horário juntos para remarcar." },
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
      {
        message:
          "Apenas proprietário ou administrador pode atribuir profissional.",
      },
      { status: 403 },
    );
  }

  const touchesPayment =
    parsed.data.paidAt !== undefined ||
    parsed.data.paymentMethod !== undefined ||
    parsed.data.amountPaid !== undefined;
  if (touchesPayment && !canRecordPayment(auth.access.role)) {
    return NextResponse.json(
      {
        message:
          "Apenas proprietário ou administrador pode registar pagamento.",
      },
      { status: 403 },
    );
  }

  const appointment = await prisma.appointment.findFirst({
    where: {
      id,
      ...appointmentScopeWhere(auth.access),
    },
    include: {
      service: true,
      unit: { select: { organizationId: true } },
    },
  });

  if (!appointment) {
    return NextResponse.json(
      { message: "Agendamento não encontrado." },
      { status: 404 },
    );
  }

  const organizationId =
    appointment.unit?.organizationId ??
    (
      await prisma.service.findUnique({
        where: { id: appointment.serviceId },
        select: { unit: { select: { organizationId: true } } },
      })
    )?.unit.organizationId;

  if (!organizationId) {
    return NextResponse.json(
      { message: "Organização do agendamento não encontrada." },
      { status: 400 },
    );
  }

  const updateData: Prisma.AppointmentUncheckedUpdateInput = {};
  let notifyPayload: Parameters<typeof notifyBarberNewAssignment>[0] | null =
    null;
  let previousStartsAt: Date | null = null;
  let didReschedule = false;
  let didCancel = false;

  if (parsed.data.date && parsed.data.time) {
    if (appointment.status !== "CONFIRMED") {
      return NextResponse.json(
        { message: "Só é possível remarcar agendamentos confirmados." },
        { status: 409 },
      );
    }
    if (appointment.startsAt.getTime() <= Date.now()) {
      return NextResponse.json(
        { message: "O horário deste agendamento já passou." },
        { status: 409 },
      );
    }
    if (!appointment.unitId) {
      return NextResponse.json(
        { message: "Agendamento sem unidade — não é possível remarcar." },
        { status: 400 },
      );
    }

    const slot = await assertPublicBookingSlot({
      service: appointment.service,
      dateStr: parsed.data.date,
      timeStr: parsed.data.time,
      unitId: appointment.unitId,
      staffMemberId: appointment.staffMemberId ?? undefined,
      excludeAppointmentId: appointment.id,
      organizationId,
    });
    if (!slot.ok) {
      return NextResponse.json(
        { message: slot.message },
        { status: slot.status },
      );
    }

    previousStartsAt = appointment.startsAt;
    updateData.startsAt = slot.startsAt;
    updateData.endsAt = slot.endsAt;
    if (slot.assignedStaff?.id) {
      updateData.staffMemberId = slot.assignedStaff.id;
    }
    didReschedule = true;
  }

  if (parsed.data.status !== undefined) {
    updateData.status = parsed.data.status;
    if (parsed.data.status === "CANCELLED" && appointment.status === "CONFIRMED") {
      didCancel = true;
    }
  }

  if (parsed.data.paidAt !== undefined) {
    if (parsed.data.paidAt === null) {
      updateData.paidAt = null;
      updateData.paymentMethod = null;
      updateData.amountPaid = null;
      updateData.paymentStatus = "UNPAID";
    } else {
      updateData.paidAt = new Date(parsed.data.paidAt);
      updateData.paymentStatus = "PAID";
      if (parsed.data.paymentMethod !== undefined) {
        updateData.paymentMethod = parsed.data.paymentMethod;
      }
    }
  } else if (parsed.data.paymentMethod !== undefined) {
    updateData.paymentMethod = parsed.data.paymentMethod;
  }

  if (parsed.data.amountPaid !== undefined) {
    updateData.amountPaid = parsed.data.amountPaid;
  }

  if (parsed.data.staffMemberId !== undefined) {
    const nextStaffId = parsed.data.staffMemberId;
    const previousStaffId = appointment.staffMemberId;
    const scheduleAt =
      (updateData.startsAt as Date | undefined) ?? appointment.startsAt;

    if (nextStaffId === null) {
      updateData.staffMemberId = null;
    } else {
      const staff = await prisma.staffMember.findFirst({
        where: {
          id: nextStaffId,
          role: "STAFF",
          organizationId: auth.access.organizationId,
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
          {
            message:
              "O profissional pertence a outra unidade que este agendamento.",
          },
          { status: 400 },
        );
      }

      if (appointment.unitId !== null && staff.unitId === null) {
        return NextResponse.json(
          {
            message:
              "O profissional precisa estar vinculado à mesma unidade do agendamento.",
          },
          { status: 400 },
        );
      }

      if (
        !isSlotWithinStaffSchedule(
          staff.workWeekJson,
          scheduleAt,
          appointment.service.durationMinutes,
        )
      ) {
        return NextResponse.json(
          {
            message:
              "Este horário está fora do expediente configurado pelo profissional.",
          },
          { status: 400 },
        );
      }

      updateData.staffMemberId = staff.id;

      if (nextStaffId !== previousStaffId) {
        notifyPayload = {
          staffMemberId: staff.id,
          barberEmail: staff.email,
          barberDisplayName: staff.displayName,
          clientName: appointment.clientName,
          clientPhone: appointment.clientPhone,
          clientEmail: appointment.clientEmail,
          serviceName: appointment.service.name,
          startsAt: scheduleAt,
          notes: appointment.notes,
        };
      }
    }
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: updateData,
    include: { service: true },
  });

  if (notifyPayload) {
    void notifyBarberNewAssignment(notifyPayload);
  }

  if (didCancel) {
    void notifyClientAppointmentChange({
      organizationId,
      appointment: updated,
      kind: "cancelled",
      actor: "salon",
    });
    void notifyStaffForAppointmentId(updated.id, "cancelled", "salon");
  }

  if (didReschedule) {
    void notifyClientAppointmentChange({
      organizationId,
      appointment: updated,
      kind: "rescheduled",
      actor: "salon",
      previousStartsAt,
    });
    void notifyStaffForAppointmentId(
      updated.id,
      "rescheduled",
      "salon",
      previousStartsAt,
    );
  }

  return NextResponse.json({
    ok: true,
    startsAt: updated.startsAt.toISOString(),
    endsAt: updated.endsAt.toISOString(),
    status: updated.status,
  });
}

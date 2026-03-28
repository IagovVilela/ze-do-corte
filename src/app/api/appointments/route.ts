import { parseISO } from "date-fns";
import { NextResponse } from "next/server";

import { buildAppointmentSlotConflictWhere } from "@/lib/appointment-slot-conflict";
import { getDefaultBarbershopUnitId } from "@/lib/barbershop-unit";
import { notifyBarberNewAssignment } from "@/lib/notify-barber-booking";
import { createAppointmentSchema } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import {
  getSlotEnd,
  getSlotStart,
  isSlotWithinBusinessHours,
} from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createAppointmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const payload = parsed.data;
    const service = await prisma.service.findUnique({
      where: { id: payload.serviceId },
    });

    if (!service || !service.isActive) {
      return NextResponse.json(
        { message: "Serviço inválido ou indisponível." },
        { status: 404 },
      );
    }

    const day = parseISO(payload.date);
    if (Number.isNaN(day.getTime())) {
      return NextResponse.json({ message: "Data inválida." }, { status: 400 });
    }

    const startsAt = getSlotStart(day, payload.time);
    const endsAt = getSlotEnd(startsAt, service.durationMinutes);

    if (startsAt.getDay() === 0) {
      return NextResponse.json(
        { message: "A barbearia não abre ao domingo." },
        { status: 400 },
      );
    }

    if (!isSlotWithinBusinessHours(startsAt, service.durationMinutes)) {
      return NextResponse.json(
        { message: "Horário fora do expediente para este serviço." },
        { status: 400 },
      );
    }

    const defaultUnitId = await getDefaultBarbershopUnitId();

    let assignedStaff: {
      id: string;
      email: string;
      displayName: string | null;
    } | null = null;

    if (payload.staffMemberId) {
      if (!defaultUnitId) {
        return NextResponse.json(
          { message: "Não é possível escolher profissional sem unidade configurada." },
          { status: 400 },
        );
      }
      const staff = await prisma.staffMember.findFirst({
        where: {
          id: payload.staffMemberId,
          role: "STAFF",
          unitId: defaultUnitId,
        },
        select: { id: true, email: true, displayName: true },
      });
      if (!staff) {
        return NextResponse.json(
          { message: "Profissional inválido ou não pertence à unidade de agendamento." },
          { status: 400 },
        );
      }
      assignedStaff = staff;
    }

    const conflict = await prisma.appointment.findFirst({
      where: buildAppointmentSlotConflictWhere({
        unitId: defaultUnitId,
        rangeStart: startsAt,
        rangeEnd: endsAt,
        ...(assignedStaff
          ? { assignedStaffMemberId: assignedStaff.id }
          : {}),
      }),
      select: { id: true },
    });

    if (conflict) {
      return NextResponse.json(
        { message: "Esse horário já foi reservado." },
        { status: 409 },
      );
    }

    const appointment = await prisma.appointment.create({
      data: {
        clientName: payload.customerName,
        clientPhone: payload.customerPhone,
        clientEmail: payload.customerEmail || null,
        notes: payload.notes || null,
        startsAt,
        endsAt,
        serviceId: payload.serviceId,
        unitId: defaultUnitId,
        staffMemberId: assignedStaff?.id ?? null,
      },
      include: {
        service: true,
      },
    });

    if (assignedStaff) {
      void notifyBarberNewAssignment({
        barberEmail: assignedStaff.email,
        barberDisplayName: assignedStaff.displayName,
        clientName: payload.customerName,
        clientPhone: payload.customerPhone,
        clientEmail: payload.customerEmail?.trim() || null,
        serviceName: appointment.service.name,
        startsAt: appointment.startsAt,
        notes: payload.notes ?? null,
      });
    }

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error("POST /api/appointments error", error);
    return NextResponse.json(
      { message: "Não foi possível criar seu agendamento." },
      { status: 500 },
    );
  }
}

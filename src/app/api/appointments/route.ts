import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { notifyBarberNewAssignment } from "@/lib/notify-barber-booking";
import { assertPublicBookingSlot } from "@/lib/public-booking-slot";
import { createAppointmentSchema } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { getDefaultBarbershopUnitId } from "@/lib/barbershop-unit";

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

    const slot = await assertPublicBookingSlot({
      service,
      dateStr: payload.date,
      timeStr: payload.time,
      unitId: payload.unitId,
      staffMemberId: payload.staffMemberId,
    });

    if (!slot.ok) {
      return NextResponse.json(
        { message: slot.message },
        { status: slot.status },
      );
    }

    const { startsAt, endsAt, assignedStaff } = slot;

    const appointment = await prisma.appointment.create({
      data: {
        clientName: payload.customerName,
        clientPhone: payload.customerPhone,
        clientEmail: payload.customerEmail || null,
        notes: payload.notes || null,
        startsAt,
        endsAt,
        serviceId: payload.serviceId,
        unitId: payload.unitId,
        staffMemberId: assignedStaff?.id ?? null,
        clientManageToken: randomUUID(),
      },
      include: {
        service: true,
      },
    });

    if (assignedStaff) {
      void notifyBarberNewAssignment({
        staffMemberId: assignedStaff.id,
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

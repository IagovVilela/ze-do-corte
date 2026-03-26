import { parseISO } from "date-fns";
import { NextResponse } from "next/server";

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

    const conflict = await prisma.appointment.findFirst({
      where: {
        status: {
          in: ["CONFIRMED", "COMPLETED"],
        },
        startsAt: {
          lt: endsAt,
        },
        endsAt: {
          gt: startsAt,
        },
      },
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
      },
      include: {
        service: true,
      },
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error("POST /api/appointments error", error);
    return NextResponse.json(
      { message: "Não foi possível criar seu agendamento." },
      { status: 500 },
    );
  }
}

import { format, isValid, parseISO, startOfDay } from "date-fns";
import { NextResponse } from "next/server";

import { BUSINESS_HOURS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getSlotEnd, getSlotStart, isSlotWithinBusinessHours } from "@/lib/utils";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

function isDateBlocked(day: Date) {
  return day.getDay() === 0;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateValue = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");

  if (!dateValue || !dateRegex.test(dateValue)) {
    return NextResponse.json(
      { error: "Formato de data inválido. Use YYYY-MM-DD." },
      { status: 400 },
    );
  }

  if (!serviceId) {
    return NextResponse.json(
      { error: "Serviço é obrigatório." },
      { status: 400 },
    );
  }

  const day = parseISO(dateValue);
  if (!isValid(day)) {
    return NextResponse.json({ error: "Data inválida." }, { status: 400 });
  }

  if (isDateBlocked(day)) {
    return NextResponse.json({
      date: format(day, "yyyy-MM-dd"),
      availableSlots: [],
    });
  }

  const dayStart = startOfDay(day);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [service, appointments] = await Promise.all([
    prisma.service.findUnique({
      where: { id: serviceId },
      select: { durationMinutes: true, isActive: true },
    }),
    prisma.appointment.findMany({
      where: {
        startsAt: {
          gte: dayStart,
          lt: dayEnd,
        },
        status: {
          in: ["CONFIRMED", "COMPLETED"],
        },
      },
      select: {
        startsAt: true,
        endsAt: true,
      },
    }),
  ]);

  if (!service || !service.isActive) {
    return NextResponse.json(
      { error: "Serviço inválido." },
      { status: 404 },
    );
  }

  const now = new Date();
  const slots = BUSINESS_HOURS.map((hour) => {
    const slotStart = getSlotStart(dayStart, hour);
    const slotEnd = getSlotEnd(slotStart, service.durationMinutes);
    const overlaps = appointments.some(
      (appointment) =>
        appointment.startsAt.getTime() < slotEnd.getTime() &&
        appointment.endsAt.getTime() > slotStart.getTime(),
    );
    const withinHours = isSlotWithinBusinessHours(
      slotStart,
      service.durationMinutes,
    );
    const available =
      withinHours &&
      !overlaps &&
      slotStart.getTime() > now.getTime();
    return {
      hour,
      available,
    };
  });

  return NextResponse.json({
    date: format(dayStart, "yyyy-MM-dd"),
    availableSlots: slots.filter((slot) => slot.available).map((slot) => slot.hour),
  });
}

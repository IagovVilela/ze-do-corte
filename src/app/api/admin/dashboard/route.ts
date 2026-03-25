import { endOfDay, endOfWeek, format, startOfDay, startOfWeek, subDays } from "date-fns";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const now = new Date();
    const startToday = startOfDay(now);
    const endToday = endOfDay(now);
    const startWeek = startOfWeek(now, { weekStartsOn: 1 });
    const endWeek = endOfWeek(now, { weekStartsOn: 1 });
    const lastSevenDays = subDays(startToday, 6);

    const [appointmentsLastSeven, todayCount, weekCount, totalCount] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          startsAt: {
            gte: lastSevenDays,
          },
        },
        include: {
          service: true,
        },
        orderBy: {
          startsAt: "asc",
        },
      }),
      prisma.appointment.count({
        where: {
          startsAt: {
            gte: startToday,
            lte: endToday,
          },
        },
      }),
      prisma.appointment.count({
        where: {
          startsAt: {
            gte: startWeek,
            lte: endWeek,
          },
        },
      }),
      prisma.appointment.count(),
    ]);

    const byDayMap = new Map<string, number>();
    for (let i = 0; i < 7; i += 1) {
      const day = subDays(startToday, 6 - i);
      byDayMap.set(format(day, "yyyy-MM-dd"), 0);
    }

    appointmentsLastSeven.forEach((appointment) => {
      const key = format(appointment.startsAt, "yyyy-MM-dd");
      byDayMap.set(key, (byDayMap.get(key) ?? 0) + 1);
    });

    const series = Array.from(byDayMap.entries()).map(([key, count]) => ({
      date: key,
      dateLabel: format(new Date(`${key}T00:00:00`), "dd/MM"),
      count,
    }));

    return NextResponse.json({
      metrics: {
        totalToday: todayCount,
        totalWeek: weekCount,
        totalAppointments: totalCount,
      },
      series,
    });
  } catch (error) {
    console.error("Erro ao montar dashboard:", error);
    return NextResponse.json(
      { message: "Não foi possível carregar o dashboard." },
      { status: 500 },
    );
  }
}

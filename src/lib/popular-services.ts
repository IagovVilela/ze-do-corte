import "server-only";

import { subDays } from "date-fns";
import { AppointmentStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Serviços mais pedidos da barbearia (últimos N dias), por unidade.
 * Conta linhas de comanda (`AppointmentItem`) e, se vazio, o serviço principal do agendamento.
 */
export async function getPopularServiceIds(options: {
  organizationId: string;
  unitId?: string | null;
  limit?: number;
  days?: number;
}): Promise<string[]> {
  const limit = Math.min(8, Math.max(1, options.limit ?? 5));
  const days = Math.min(365, Math.max(30, options.days ?? 90));
  const since = subDays(new Date(), days);

  const unitFilter = options.unitId
    ? { unitId: options.unitId }
    : { unit: { organizationId: options.organizationId } };

  const appointmentScope = {
    status: { not: AppointmentStatus.CANCELLED },
    startsAt: { gte: since },
    ...unitFilter,
  };

  try {
    const grouped = await prisma.appointmentItem.groupBy({
      by: ["serviceId"],
      where: {
        appointment: appointmentScope,
      },
      _count: { serviceId: true },
      orderBy: { _count: { serviceId: "desc" } },
      take: limit,
    });

    if (grouped.length > 0) {
      return grouped.map((g) => g.serviceId);
    }

    const legacy = await prisma.appointment.groupBy({
      by: ["serviceId"],
      where: appointmentScope,
      _count: { serviceId: true },
      orderBy: { _count: { serviceId: "desc" } },
      take: limit,
    });

    return legacy.map((g) => g.serviceId);
  } catch {
    return [];
  }
}

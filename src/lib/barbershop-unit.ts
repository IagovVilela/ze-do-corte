import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Unidade padrão para agendamentos públicos e registros legados sem `unitId`.
 */
export async function getDefaultBarbershopUnitId(): Promise<string | null> {
  const preferred = await prisma.barbershopUnit.findFirst({
    where: { isDefault: true, isActive: true },
    select: { id: true },
  });
  if (preferred) return preferred.id;

  const fallback = await prisma.barbershopUnit.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return fallback?.id ?? null;
}

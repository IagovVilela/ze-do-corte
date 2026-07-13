import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Unidade padrão da organização para agendamentos públicos.
 */
export async function getDefaultBarbershopUnitId(
  organizationId: string,
): Promise<string | null> {
  const preferred = await prisma.barbershopUnit.findFirst({
    where: { organizationId, isDefault: true, isActive: true },
    select: { id: true },
  });
  if (preferred) return preferred.id;

  const fallback = await prisma.barbershopUnit.findFirst({
    where: { organizationId, isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return fallback?.id ?? null;
}

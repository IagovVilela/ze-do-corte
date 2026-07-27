import "server-only";

import { prisma } from "@/lib/prisma";

/** Unidades ativas da org para filtros do financeiro. */
export async function listFinanceUnitsForOrg(organizationId: string) {
  return prisma.barbershopUnit.findMany({
    where: { organizationId, isActive: true },
    select: { id: true, name: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

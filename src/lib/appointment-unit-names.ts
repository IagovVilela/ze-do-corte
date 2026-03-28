import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Nomes das unidades sem `include: { unit: true }` em Appointment — evita erro quando o
 * Prisma Client está desatualizado em relação ao schema (relação `unit` ausente).
 */
export async function unitNameMapByIds(
  unitIds: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(unitIds.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map();

  try {
    const client = prisma as unknown as {
      barbershopUnit?: {
        findMany: (args: {
          where: { id: { in: string[] } };
          select: { id: true; name: true };
        }) => Promise<{ id: string; name: string }[]>;
      };
    };
    if (typeof client.barbershopUnit?.findMany !== "function") {
      return new Map();
    }
    const rows = await client.barbershopUnit.findMany({
      where: { id: { in: unique } },
      select: { id: true, name: true },
    });
    return new Map(rows.map((r) => [r.id, r.name]));
  } catch {
    return new Map();
  }
}

import "server-only";

import { prisma } from "@/lib/prisma";

/** Rótulo amigável: nome de exibição ou e-mail. */
export async function staffLabelMapByIds(
  ids: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map();

  const rows = await prisma.staffMember.findMany({
    where: { id: { in: unique } },
    select: { id: true, displayName: true, email: true },
  });

  return new Map(
    rows.map((r) => [
      r.id,
      r.displayName?.trim() || r.email || r.id,
    ]),
  );
}

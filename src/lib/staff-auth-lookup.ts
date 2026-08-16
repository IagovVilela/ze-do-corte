import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type StaffAuthRow = {
  id: string;
  email: string;
  passwordHash: string | null;
  role: string;
  isActive: boolean;
  organizationId: string;
  unitId: string | null;
};

/** SQL cru para não depender do enum StaffRole no client Prisma em cache. */
export async function findStaffAuthByEmail(
  email: string,
): Promise<StaffAuthRow | null> {
  const normalized = email.toLowerCase();
  const rows = await prisma.$queryRaw<StaffAuthRow[]>(Prisma.sql`
    SELECT
      id,
      email,
      "passwordHash",
      role::text AS role,
      "isActive",
      "organizationId",
      "unitId"
    FROM "StaffMember"
    WHERE lower(email) = ${normalized}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

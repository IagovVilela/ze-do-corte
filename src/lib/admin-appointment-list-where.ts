import "server-only";

import type { Prisma } from "@prisma/client";

import type { AdminListFiltersParsed } from "@/lib/admin-list-url";
import { appointmentScopeWhere, type StaffAccess } from "@/lib/staff-access";

/** Junta âmbito do utilizador com filtros da lista (URL). */
export function appointmentListWhere(
  access: StaffAccess,
  filters: AdminListFiltersParsed,
): Prisma.AppointmentWhereInput {
  const base = appointmentScopeWhere(access);
  const parts: Prisma.AppointmentWhereInput[] = [];

  if (filters.status) {
    parts.push({ status: filters.status });
  }

  if (access.role !== "STAFF") {
    if (filters.staff === "none") {
      parts.push({ staffMemberId: null });
    } else if (filters.staff) {
      parts.push({ staffMemberId: filters.staff });
    }
    if (filters.unit) {
      parts.push({ unitId: filters.unit });
    }
  }

  if (filters.q && filters.q.length > 0) {
    const q = filters.q;
    parts.push({
      OR: [
        { clientName: { contains: q, mode: "insensitive" } },
        { clientPhone: { contains: q, mode: "insensitive" } },
        { clientEmail: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (parts.length === 0) return base;
  return { AND: [base, ...parts] };
}

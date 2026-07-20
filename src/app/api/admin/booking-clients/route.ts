import { NextResponse } from "next/server";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { brPhoneDigits, formatBrPhoneNational } from "@/lib/br-phone-format";
import { prisma } from "@/lib/prisma";
import { appointmentScopeWhere } from "@/lib/staff-access";

export const dynamic = "force-dynamic";

export type BookingClientRow = {
  name: string;
  phone: string;
  email: string | null;
  lastBookedAt: string;
};

/**
 * GET /api/admin/booking-clients
 * Clientes distintos (por telefone) que já agendaram na org — mais recentes primeiro.
 */
export async function GET() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.manageSubscriptions) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const rows = await prisma.appointment.findMany({
    where: appointmentScopeWhere(auth.access),
    select: {
      clientName: true,
      clientPhone: true,
      clientEmail: true,
      startsAt: true,
    },
    orderBy: { startsAt: "desc" },
    take: 3000,
  });

  const byPhone = new Map<string, BookingClientRow>();
  for (const row of rows) {
    const digits = brPhoneDigits(row.clientPhone);
    if (digits.length < 10) continue;
    if (byPhone.has(digits)) continue;
    byPhone.set(digits, {
      name: row.clientName.trim(),
      phone: formatBrPhoneNational(row.clientPhone),
      email: row.clientEmail?.trim() || null,
      lastBookedAt: row.startsAt.toISOString(),
    });
  }

  const clients = [...byPhone.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
  );

  return NextResponse.json({ clients });
}

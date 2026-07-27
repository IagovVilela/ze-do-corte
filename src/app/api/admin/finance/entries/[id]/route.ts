import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import {
  cancelFinanceEntry,
  markFinanceEntryPaid,
  serializeFinanceEntry,
} from "@/lib/admin-finance";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.viewRevenue) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = z
    .object({
      action: z.enum(["mark_paid", "cancel"]),
    })
    .safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: "Ação inválida." }, { status: 400 });
  }

  if (parsed.data.action === "mark_paid") {
    const r = await markFinanceEntryPaid(auth.access.organizationId, id);
    if (r.count === 0) {
      return NextResponse.json(
        { message: "Lançamento não encontrado ou já quitado." },
        { status: 404 },
      );
    }
  } else {
    const r = await cancelFinanceEntry(auth.access.organizationId, id);
    if (r.count === 0) {
      return NextResponse.json(
        { message: "Lançamento não encontrado." },
        { status: 404 },
      );
    }
  }

  const entry = await prisma.financeEntry.findFirst({
    where: { id, organizationId: auth.access.organizationId },
    include: {
      category: { select: { id: true, name: true } },
      unit: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    entry: entry ? serializeFinanceEntry(entry) : null,
  });
}

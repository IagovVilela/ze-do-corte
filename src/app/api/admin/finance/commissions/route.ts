import { NextResponse } from "next/server";
import { z } from "zod";
import { endOfDay, startOfDay, subDays } from "date-fns";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import {
  generateCommissionPayables,
  getCommissionsSnapshot,
} from "@/lib/admin-commissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.viewRevenue) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const pot = Number(searchParams.get("potPercent") ?? "30");
  const unitIdParam = searchParams.get("unitId");
  let unitId =
    unitIdParam && unitIdParam.length > 0 ? unitIdParam : undefined;

  if (unitId) {
    const unitOk = await prisma.barbershopUnit.findFirst({
      where: { id: unitId, organizationId: auth.access.organizationId },
      select: { id: true },
    });
    if (!unitOk) {
      return NextResponse.json({ message: "Filial inválida." }, { status: 400 });
    }
  }

  const to = toParam ? endOfDay(new Date(toParam)) : endOfDay(new Date());
  const from = fromParam
    ? startOfDay(new Date(fromParam))
    : startOfDay(subDays(to, 29));

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ message: "Datas inválidas." }, { status: 400 });
  }

  const snapshot = await getCommissionsSnapshot({
    organizationId: auth.access.organizationId,
    from,
    to,
    potPercent: Number.isFinite(pot) ? pot : 30,
    unitId,
  });

  return NextResponse.json(snapshot);
}

const generateSchema = z.object({
  from: z.string().min(8),
  to: z.string().min(8),
  potPercent: z.number().finite().min(0).max(100).optional(),
  staffMemberIds: z.array(z.string().min(1)).min(1),
  dueDate: z.string().min(8).optional(),
  unitId: z.string().min(1).nullable().optional(),
});

export async function POST(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.viewRevenue) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
  }

  const from = startOfDay(new Date(parsed.data.from));
  const to = endOfDay(new Date(parsed.data.to));
  const dueDate = parsed.data.dueDate
    ? startOfDay(new Date(parsed.data.dueDate))
    : startOfDay(new Date());

  if (
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime()) ||
    Number.isNaN(dueDate.getTime())
  ) {
    return NextResponse.json({ message: "Datas inválidas." }, { status: 400 });
  }

  const staffOk = await prisma.staffMember.count({
    where: {
      organizationId: auth.access.organizationId,
      id: { in: parsed.data.staffMemberIds },
      role: "STAFF",
    },
  });
  if (staffOk !== parsed.data.staffMemberIds.length) {
    return NextResponse.json(
      { message: "Profissional inválido na seleção." },
      { status: 400 },
    );
  }

  const result = await generateCommissionPayables({
    organizationId: auth.access.organizationId,
    createdById: auth.access.userId,
    from,
    to,
    potPercent: parsed.data.potPercent ?? 30,
    staffMemberIds: parsed.data.staffMemberIds,
    dueDate,
    unitId: parsed.data.unitId,
  });

  return NextResponse.json(result);
}

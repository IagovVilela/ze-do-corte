import { NextResponse } from "next/server";
import { endOfDay, startOfDay, subDays } from "date-fns";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { getFinanceBalanceSnapshot } from "@/lib/admin-finance";
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

  const snapshot = await getFinanceBalanceSnapshot({
    organizationId: auth.access.organizationId,
    from,
    to,
    unitId,
  });

  return NextResponse.json(snapshot);
}

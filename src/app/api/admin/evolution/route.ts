import { NextResponse } from "next/server";
import { endOfDay, startOfDay } from "date-fns";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { getAdminEvolutionSnapshot } from "@/lib/admin-evolution";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (auth.access.role !== "OWNER" && auth.access.role !== "ADMIN") {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const unitId = searchParams.get("unitId") || undefined;
  const rankingMonthKey = searchParams.get("rankingMonth") || undefined;

  const to = toParam ? endOfDay(new Date(toParam)) : undefined;
  const from = fromParam ? startOfDay(new Date(fromParam)) : undefined;

  if (
    (from && Number.isNaN(from.getTime())) ||
    (to && Number.isNaN(to.getTime()))
  ) {
    return NextResponse.json({ message: "Datas inválidas." }, { status: 400 });
  }

  const snapshot = await getAdminEvolutionSnapshot(auth.access, {
    from,
    to,
    unitId,
    rankingMonthKey,
  });

  return NextResponse.json(snapshot);
}

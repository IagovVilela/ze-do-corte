import { NextResponse } from "next/server";

import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { getRightHandSnapshot } from "@/lib/admin-right-hand";
import { parseDashboardRange } from "@/lib/dashboard-period";

export const dynamic = "force-dynamic";

/**
 * GET: snapshot do Braço Direito (?chartRange=&refresh=1).
 */
export async function GET(request: Request) {
  const access = await getStaffAccessOrNull();
  if (!access) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }
  if (access.role !== "OWNER" && access.role !== "ADMIN") {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }
  if (!access.permissions.viewRevenue) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const range = parseDashboardRange(
    searchParams.get("chartRange") ?? undefined,
  );
  const forceRefresh = searchParams.get("refresh") === "1";

  const snapshot = await getRightHandSnapshot(access, range, { forceRefresh });
  if (!snapshot) {
    return NextResponse.json({ message: "Indisponível." }, { status: 404 });
  }

  return NextResponse.json({ snapshot });
}

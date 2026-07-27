import { NextResponse } from "next/server";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { parseAdminListFilters } from "@/lib/admin-list-url";
import { getAdminReportsSnapshot } from "@/lib/admin-reports";
import { parseDashboardRange } from "@/lib/dashboard-period";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const range = parseDashboardRange(url.searchParams.get("chartRange") ?? undefined);
  const filters = parseAdminListFilters({
    status: url.searchParams.get("status") ?? undefined,
    staff: url.searchParams.get("staff") ?? undefined,
    unit: url.searchParams.get("unit") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
  });

  try {
    const snapshot = await getAdminReportsSnapshot(
      auth.access,
      range,
      filters,
    );
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("[admin reports]", error);
    return NextResponse.json(
      { message: "Não foi possível carregar o relatório." },
      { status: 500 },
    );
  }
}

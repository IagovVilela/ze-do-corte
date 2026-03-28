import { NextResponse } from "next/server";

import { getAdminDashboardSnapshot } from "@/lib/admin-dashboard";
import { requireStaffApiAuth } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await requireStaffApiAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const chartRange =
      new URL(request.url).searchParams.get("chartRange") ?? undefined;
    const snapshot = await getAdminDashboardSnapshot(authResult.access, chartRange);
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Erro ao montar dashboard:", error);
    return NextResponse.json(
      { message: "Não foi possível carregar o dashboard." },
      { status: 500 },
    );
  }
}

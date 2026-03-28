import { NextResponse } from "next/server";

import { getAdminDashboardSnapshot } from "@/lib/admin-dashboard";
import { requireStaffApiAuth } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET() {
  const authResult = await requireStaffApiAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const snapshot = await getAdminDashboardSnapshot(authResult.access);
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Erro ao montar dashboard:", error);
    return NextResponse.json(
      { message: "Não foi possível carregar o dashboard." },
      { status: 500 },
    );
  }
}

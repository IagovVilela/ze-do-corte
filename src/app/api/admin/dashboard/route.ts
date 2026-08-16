import { NextResponse } from "next/server";

import { getAdminDashboardSnapshot } from "@/lib/admin-dashboard";
import { requireAssistReadApiAuth } from "@/lib/admin-auth";
import {
  parseAdminListFilters,
  parseTelemetryScope,
} from "@/lib/admin-list-url";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await requireAssistReadApiAuth();
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const url = new URL(request.url);
    const chartRange = url.searchParams.get("chartRange") ?? undefined;
    const sp: Record<string, string | string[] | undefined> = {};
    for (const key of ["status", "staff", "unit", "q", "telemetryScope"] as const) {
      const v = url.searchParams.get(key);
      if (v) sp[key] = v;
    }
    const listFilters = parseAdminListFilters(sp);
    const telemetryScope = parseTelemetryScope(sp);
    const snapshot = await getAdminDashboardSnapshot(
      authResult.access,
      chartRange,
      listFilters,
      telemetryScope,
    );
    if (authResult.access.role !== "SUPPORT_ASSIST") {
      return NextResponse.json(snapshot);
    }
    return NextResponse.json({
      ...snapshot,
      metrics: {
        ...snapshot.metrics,
        revenueMonth: 0,
        receivedInPeriod: 0,
        completedValueInPeriod: 0,
        scheduledValueInPeriod: 0,
      },
      revenueSeries: snapshot.revenueSeries.map((p) => ({ ...p, amount: 0 })),
      paymentStack: snapshot.paymentStack.map((p) => ({
        ...p,
        pagos: 0,
        aReceber: 0,
      })),
      unitTelemetry: null,
    });
  } catch (error) {
    console.error("Erro ao montar dashboard:", error);
    return NextResponse.json(
      { message: "Não foi possível carregar o dashboard." },
      { status: 500 },
    );
  }
}

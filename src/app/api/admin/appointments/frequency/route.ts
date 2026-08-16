import { NextResponse } from "next/server";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { getAppointmentFrequencyHeatmap } from "@/lib/admin-appointment-frequency";
import {
  getDashboardPeriodMeta,
  parseDashboardRange,
} from "@/lib/dashboard-period";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const unitId = url.searchParams.get("unit")?.trim() || null;
  const staffMemberId = url.searchParams.get("staff")?.trim() || null;
  const rangeRaw = url.searchParams.get("chartRange");
  const useRange = rangeRaw != null && rangeRaw.trim() !== "";

  try {
    if (useRange) {
      const chartRange = parseDashboardRange(rangeRaw ?? undefined);
      const meta = getDashboardPeriodMeta(chartRange, new Date());
      const heatmap = await getAppointmentFrequencyHeatmap(auth.access, {
        unitId,
        staffMemberId,
        from: meta.from,
        to: meta.to,
        chartRange,
        periodLabel: meta.periodLabel,
      });
      return NextResponse.json(heatmap);
    }

    const heatmap = await getAppointmentFrequencyHeatmap(auth.access, {
      unitId,
      staffMemberId,
      periodLabel: "Últimos 30 dias",
    });
    return NextResponse.json(heatmap);
  } catch (error) {
    console.error("[admin appointments frequency]", error);
    return NextResponse.json(
      { message: "Não foi possível carregar a frequência de cortes." },
      { status: 500 },
    );
  }
}

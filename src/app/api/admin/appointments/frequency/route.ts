import { NextResponse } from "next/server";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { getAppointmentFrequencyHeatmap } from "@/lib/admin-appointment-frequency";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const unitId = url.searchParams.get("unit")?.trim() || null;
  const staffMemberId = url.searchParams.get("staff")?.trim() || null;

  try {
    const heatmap = await getAppointmentFrequencyHeatmap(auth.access, {
      unitId,
      staffMemberId,
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

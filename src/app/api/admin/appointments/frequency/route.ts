import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { getAppointmentFrequencyHeatmap } from "@/lib/admin-appointment-frequency";
import {
  getDashboardPeriodMeta,
  parseDashboardRange,
} from "@/lib/dashboard-period";

export const dynamic = "force-dynamic";

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use data no formato AAAA-MM-DD.");

const MAX_RANGE_DAYS = 365;

export async function GET(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const unitId = url.searchParams.get("unit")?.trim() || null;
  const staffMemberId = url.searchParams.get("staff")?.trim() || null;
  const fromRaw = url.searchParams.get("from")?.trim() ?? "";
  const toRaw = url.searchParams.get("to")?.trim() ?? "";
  const rangeRaw = url.searchParams.get("chartRange");
  const useCustomDates = fromRaw !== "" || toRaw !== "";
  const useRange = rangeRaw != null && rangeRaw.trim() !== "";

  try {
    if (useCustomDates) {
      const fromParsed = dateOnly.safeParse(fromRaw);
      const toParsed = dateOnly.safeParse(toRaw);
      if (!fromParsed.success || !toParsed.success) {
        return NextResponse.json(
          { message: "Informe from e to (AAAA-MM-DD)." },
          { status: 400 },
        );
      }

      let fromYmd = fromParsed.data;
      let toYmd = toParsed.data;
      if (
        format(parseISO(`${fromYmd}T12:00:00`), "yyyy-MM-dd") !== fromYmd ||
        format(parseISO(`${toYmd}T12:00:00`), "yyyy-MM-dd") !== toYmd
      ) {
        return NextResponse.json(
          { message: "Informe from e to (AAAA-MM-DD)." },
          { status: 400 },
        );
      }
      if (fromYmd > toYmd) {
        const swap = fromYmd;
        fromYmd = toYmd;
        toYmd = swap;
      }

      const span = differenceInCalendarDays(
        parseISO(`${toYmd}T12:00:00`),
        parseISO(`${fromYmd}T12:00:00`),
      );
      if (span > MAX_RANGE_DAYS) {
        return NextResponse.json(
          { message: "Intervalo máximo de 366 dias." },
          { status: 400 },
        );
      }

      const heatmap = await getAppointmentFrequencyHeatmap(auth.access, {
        unitId,
        staffMemberId,
        fromYmd,
        toYmd,
      });
      return NextResponse.json(heatmap);
    }

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

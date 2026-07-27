import { NextResponse } from "next/server";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import {
  AppointmentRangeError,
  listAdminAppointmentsInRange,
} from "@/lib/admin-appointments";
import { parseAdminListFilters } from "@/lib/admin-list-url";
import { BARBER_TIMEZONE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use data no formato AAAA-MM-DD.");

function parseYmd(dateStr: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y: y!, m: m!, d: d! };
}

function dayStartInShopTz(dateStr: string, tz: string): Date {
  const { y, m, d } = parseYmd(dateStr);
  return fromZonedTime(new Date(y, m - 1, d, 0, 0, 0, 0), tz);
}

function dayEndInShopTz(dateStr: string, tz: string): Date {
  const { y, m, d } = parseYmd(dateStr);
  return fromZonedTime(new Date(y, m - 1, d, 23, 59, 59, 999), tz);
}

export async function GET(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const fromParsed = dateOnly.safeParse(url.searchParams.get("from") ?? "");
  const toParsed = dateOnly.safeParse(url.searchParams.get("to") ?? "");
  if (!fromParsed.success || !toParsed.success) {
    return NextResponse.json(
      { message: "Informe from e to (AAAA-MM-DD)." },
      { status: 400 },
    );
  }

  const org = await prisma.organization.findUnique({
    where: { id: auth.access.organizationId },
    select: { timezone: true },
  });
  const tz = org?.timezone?.trim() || BARBER_TIMEZONE;

  const from = dayStartInShopTz(fromParsed.data, tz);
  const to = dayEndInShopTz(toParsed.data, tz);

  const filters = parseAdminListFilters({
    status: url.searchParams.get("status") ?? undefined,
    staff: url.searchParams.get("staff") ?? undefined,
    unit: url.searchParams.get("unit") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
  });

  try {
    const rows = await listAdminAppointmentsInRange(
      auth.access,
      from,
      to,
      filters,
    );
    return NextResponse.json({
      rows,
      from: fromParsed.data,
      to: toParsed.data,
      timezone: tz,
    });
  } catch (error) {
    if (error instanceof AppointmentRangeError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    const detail =
      error instanceof Error ? error.message.split("\n")[0] : String(error);
    console.warn("[admin appointments range]", detail);
    return NextResponse.json(
      {
        message:
          process.env.NODE_ENV === "development"
            ? `Não foi possível carregar os agendamentos. (${detail})`
            : "Não foi possível carregar os agendamentos.",
      },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import {
  createEncaixeBooking,
  previewEncaixeGaps,
} from "@/lib/encaixe-booking";
import { prisma } from "@/lib/prisma";
import { unitScopeWhere } from "@/lib/staff-access";

export const dynamic = "force-dynamic";

const previewSchema = z.object({
  unitId: z.string().min(1),
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  staffMemberId: z.string().min(1).optional(),
});

const createSchema = z.object({
  unitId: z.string().min(1),
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(8).max(40),
  customerEmail: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal(""))
    .nullable(),
  notes: z.string().trim().max(240).optional().nullable(),
  staffMemberId: z.string().min(1).optional().nullable(),
  force: z.boolean().optional(),
});

async function assertUnitInScope(
  organizationId: string,
  unitId: string,
  access: Parameters<typeof unitScopeWhere>[0],
) {
  return prisma.barbershopUnit.findFirst({
    where: {
      id: unitId,
      organizationId,
      isActive: true,
      ...unitScopeWhere(access),
    },
    select: { id: true },
  });
}

/** Prévia de buracos livres para encaixe limpo. */
export async function GET(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const parsed = previewSchema.safeParse({
    unitId: url.searchParams.get("unitId") ?? "",
    serviceId: url.searchParams.get("serviceId") ?? "",
    date: url.searchParams.get("date") ?? "",
    staffMemberId: url.searchParams.get("staffMemberId") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Parâmetros inválidos." },
      { status: 400 },
    );
  }

  const unit = await assertUnitInScope(
    auth.access.organizationId,
    parsed.data.unitId,
    auth.access,
  );
  if (!unit) {
    return NextResponse.json({ message: "Unidade inválida." }, { status: 400 });
  }

  let staffMemberId = parsed.data.staffMemberId;
  if (auth.access.role === "STAFF") {
    staffMemberId = auth.access.userId;
  }

  const result = await previewEncaixeGaps({
    organizationId: auth.access.organizationId,
    unitId: parsed.data.unitId,
    serviceId: parsed.data.serviceId,
    date: parsed.data.date,
    staffMemberId,
  });

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({
    durationMinutes: result.durationMinutes,
    suggestions: result.suggestions,
  });
}

/** Cria atendimento de encaixe (balcão). */
export async function POST(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const unit = await assertUnitInScope(
    auth.access.organizationId,
    parsed.data.unitId,
    auth.access,
  );
  if (!unit) {
    return NextResponse.json({ message: "Unidade inválida." }, { status: 400 });
  }

  let staffMemberId = parsed.data.staffMemberId ?? undefined;
  if (auth.access.role === "STAFF") {
    staffMemberId = auth.access.userId;
  }

  const result = await createEncaixeBooking({
    organizationId: auth.access.organizationId,
    unitId: parsed.data.unitId,
    serviceId: parsed.data.serviceId,
    date: parsed.data.date,
    time: parsed.data.time,
    customerName: parsed.data.customerName,
    customerPhone: parsed.data.customerPhone,
    customerEmail: parsed.data.customerEmail,
    notes: parsed.data.notes,
    staffMemberId,
    force: parsed.data.force === true,
    createdByStaffId: auth.access.userId,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        message: result.message,
        conflicts: result.conflicts,
        suggestions: result.suggestions,
      },
      { status: result.status },
    );
  }

  return NextResponse.json({
    appointment: {
      id: result.appointment.id,
      startsAt: result.appointment.startsAt.toISOString(),
      endsAt: result.appointment.endsAt.toISOString(),
      clientName: result.appointment.clientName,
      bookingSource: result.appointment.bookingSource,
    },
    forced: result.forced,
    conflicts: result.conflicts,
  });
}

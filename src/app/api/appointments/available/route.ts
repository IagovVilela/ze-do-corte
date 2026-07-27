import { isValid, parseISO } from "date-fns";
import { NextResponse } from "next/server";

import { getDefaultBarbershopUnitId } from "@/lib/barbershop-unit";
import {
  listPublicAvailableSlots,
  resolveBookingDurationMinutes,
} from "@/lib/booking-availability";
import { prisma } from "@/lib/prisma";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateValue = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");
  const serviceIdsParam = searchParams.get("serviceIds");
  const unitIdParam = searchParams.get("unitId");
  const staffMemberIdParam = searchParams.get("staffMemberId");

  if (!dateValue || !dateRegex.test(dateValue)) {
    return NextResponse.json(
      { error: "Formato de data inválido. Use YYYY-MM-DD." },
      { status: 400 },
    );
  }

  const serviceIds = [
    ...new Set(
      [
        ...(serviceIdsParam
          ? serviceIdsParam.split(",").map((s) => s.trim())
          : []),
        ...(serviceId ? [serviceId] : []),
      ].filter(Boolean),
    ),
  ];

  if (serviceIds.length === 0) {
    return NextResponse.json(
      { error: "Serviço é obrigatório." },
      { status: 400 },
    );
  }

  const day = parseISO(dateValue);
  if (!isValid(day)) {
    return NextResponse.json({ error: "Data inválida." }, { status: 400 });
  }

  const organizationSlug = searchParams.get("organizationSlug");
  let organizationId: string | null = null;
  if (organizationSlug) {
    const org = await prisma.organization.findUnique({
      where: { slug: organizationSlug.trim().toLowerCase() },
      select: { id: true },
    });
    if (!org) {
      return NextResponse.json(
        { error: "Barbearia não encontrada." },
        { status: 404 },
      );
    }
    organizationId = org.id;
  }

  let resolvedUnitId =
    unitIdParam && unitIdParam.length > 0 ? unitIdParam : null;

  if (resolvedUnitId) {
    const unitRow = await prisma.barbershopUnit.findFirst({
      where: {
        id: resolvedUnitId,
        ...(organizationId ? { organizationId } : {}),
      },
      select: { id: true, organizationId: true },
    });
    if (!unitRow) {
      return NextResponse.json(
        { error: "Unidade inválida para esta barbearia." },
        { status: 400 },
      );
    }
    organizationId = unitRow.organizationId;
  }

  if (!organizationId) {
    return NextResponse.json(
      { error: "Informe organizationSlug ou unitId." },
      { status: 400 },
    );
  }

  if (!resolvedUnitId) {
    resolvedUnitId = await getDefaultBarbershopUnitId(organizationId);
  }

  let bookWithStaffId: string | null = null;
  if (staffMemberIdParam && staffMemberIdParam.length > 0) {
    if (!resolvedUnitId) {
      return NextResponse.json(
        { error: "Profissional só pode ser filtrado com unidade definida." },
        { status: 400 },
      );
    }
    const staffOk = await prisma.staffMember.findFirst({
      where: {
        id: staffMemberIdParam,
        role: "STAFF",
        unitId: resolvedUnitId,
        organizationId,
      },
      select: { id: true },
    });
    if (!staffOk) {
      return NextResponse.json(
        { error: "Profissional inválido para esta unidade." },
        { status: 400 },
      );
    }
    bookWithStaffId = staffOk.id;
  }

  const durationResolved = await resolveBookingDurationMinutes({
    organizationId,
    unitId: resolvedUnitId,
    serviceIds,
  });
  if (!durationResolved.ok) {
    return NextResponse.json(
      { error: durationResolved.message },
      { status: durationResolved.status },
    );
  }

  const clientDuration = Number(searchParams.get("durationMinutes") ?? "");
  const durationMinutes =
    Number.isFinite(clientDuration) && clientDuration >= 1
      ? Math.min(480, Math.round(clientDuration))
      : durationResolved.durationMinutes;

  const result = await listPublicAvailableSlots({
    organizationId,
    unitId: resolvedUnitId,
    day,
    durationMinutes,
    staffMemberId: bookWithStaffId,
  });

  return NextResponse.json({
    date: result.date,
    durationMinutes: result.durationMinutes,
    availableSlots: result.availableSlots,
    slotEndsAt: Object.fromEntries(
      result.slotDetails.map((s) => [s.hour, s.endsAtLabel]),
    ),
  });
}

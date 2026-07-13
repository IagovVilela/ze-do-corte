import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { notifyBarberNewAssignment } from "@/lib/notify-barber-booking";
import { assertPublicBookingSlot } from "@/lib/public-booking-slot";
import { createAppointmentSchema } from "@/lib/types";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createAppointmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const payload = parsed.data;

    let organizationId: string | null = null;
    if (payload.organizationSlug) {
      const org = await prisma.organization.findUnique({
        where: { slug: payload.organizationSlug.trim().toLowerCase() },
        select: { id: true },
      });
      if (!org) {
        return NextResponse.json(
          { message: "Barbearia não encontrada." },
          { status: 404 },
        );
      }
      organizationId = org.id;
    }

    const unit = await prisma.barbershopUnit.findFirst({
      where: {
        id: payload.unitId,
        isActive: true,
        ...(organizationId ? { organizationId } : {}),
      },
      select: { id: true, organizationId: true },
    });
    if (!unit) {
      return NextResponse.json(
        { message: "Unidade inválida." },
        { status: 400 },
      );
    }
    organizationId = unit.organizationId;

    const service = await prisma.service.findFirst({
      where: {
        id: payload.serviceId,
        unit: { organizationId },
      },
      include: { unitOverrides: true },
    });

    if (!service) {
      return NextResponse.json(
        { message: "Serviço inválido." },
        { status: 404 },
      );
    }

    const unitOverride = service.unitOverrides.find(
      (o) => o.unitId === payload.unitId,
    );
    const isActive = unitOverride ? unitOverride.isActive : service.isActive;
    const durationMinutes =
      unitOverride && unitOverride.durationMinutes !== null
        ? unitOverride.durationMinutes
        : service.durationMinutes;

    if (!isActive) {
      return NextResponse.json(
        { message: "Serviço indisponível nesta unidade." },
        { status: 404 },
      );
    }

    if (service.unitId !== payload.unitId && !unitOverride) {
      return NextResponse.json(
        { message: "Este serviço não está disponível na unidade selecionada." },
        { status: 400 },
      );
    }

    const slot = await assertPublicBookingSlot({
      service: { ...service, durationMinutes },
      dateStr: payload.date,
      timeStr: payload.time,
      unitId: payload.unitId,
      staffMemberId: payload.staffMemberId,
      organizationId,
    });

    if (!slot.ok) {
      return NextResponse.json(
        { message: slot.message },
        { status: slot.status },
      );
    }

    const { startsAt, endsAt, assignedStaff } = slot;

    const appointment = await prisma.appointment.create({
      data: {
        clientName: payload.customerName,
        clientPhone: payload.customerPhone,
        clientEmail: payload.customerEmail || null,
        notes: payload.notes || null,
        startsAt,
        endsAt,
        serviceId: payload.serviceId,
        unitId: payload.unitId,
        staffMemberId: assignedStaff?.id ?? null,
        clientManageToken: randomUUID(),
      },
      include: {
        service: true,
      },
    });

    if (assignedStaff) {
      void notifyBarberNewAssignment({
        staffMemberId: assignedStaff.id,
        barberEmail: assignedStaff.email,
        barberDisplayName: assignedStaff.displayName,
        clientName: payload.customerName,
        clientPhone: payload.customerPhone,
        clientEmail: payload.customerEmail?.trim() || null,
        serviceName: appointment.service.name,
        startsAt: appointment.startsAt,
        notes: payload.notes ?? null,
      });
    }

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error("POST /api/appointments error", error);
    return NextResponse.json(
      { message: "Não foi possível criar seu agendamento." },
      { status: 500 },
    );
  }
}

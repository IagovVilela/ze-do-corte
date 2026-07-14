import { NextResponse } from "next/server";

import { createPublicBooking } from "@/lib/booking-domain";
import { notifyClientWhatsAppConfirmation } from "@/lib/whatsapp-notify-client";
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

    const created = await createPublicBooking({
      organizationId: unit.organizationId,
      unitId: payload.unitId,
      serviceId: payload.serviceId,
      date: payload.date,
      time: payload.time,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      customerEmail: payload.customerEmail,
      notes: payload.notes,
      staffMemberId: payload.staffMemberId,
      bookingSource: "site",
    });

    if (!created.ok) {
      return NextResponse.json(
        { message: created.message },
        { status: created.status },
      );
    }

    void notifyClientWhatsAppConfirmation({
      organizationId: unit.organizationId,
      appointment: created.appointment,
    });

    return NextResponse.json({ appointment: created.appointment }, { status: 201 });
  } catch (error) {
    console.error("POST /api/appointments error", error);
    return NextResponse.json(
      { message: "Não foi possível criar seu agendamento." },
      { status: 500 },
    );
  }
}

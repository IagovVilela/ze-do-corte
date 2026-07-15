import { NextResponse } from "next/server";
import { z } from "zod";

import { isClientManageTokenFormat } from "@/lib/client-manage-token";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  manageToken: z.string().trim().min(10).max(80),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional().nullable(),
});

function canLeaveReview(row: {
  status: string;
  startsAt: Date;
}): string | null {
  if (row.status === "CANCELLED") {
    return "Agendamento cancelado não pode ser avaliado.";
  }
  if (row.status === "COMPLETED") return null;
  if (row.status === "CONFIRMED" && row.startsAt.getTime() <= Date.now()) {
    return null;
  }
  if (row.status === "CONFIRMED") {
    return "Aguarde o horário do atendimento para avaliar.";
  }
  return "Este atendimento não pode ser avaliado.";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const token = parsed.data.manageToken.trim();
  if (!isClientManageTokenFormat(token)) {
    return NextResponse.json({ message: "Link inválido." }, { status: 400 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { clientManageToken: token },
    select: {
      id: true,
      status: true,
      startsAt: true,
      clientName: true,
      clientPhone: true,
      review: { select: { id: true } },
      unit: { select: { organizationId: true } },
      service: {
        select: {
          unit: { select: { organizationId: true } },
        },
      },
    },
  });

  if (!appointment) {
    return NextResponse.json({ message: "Reserva não encontrada." }, { status: 404 });
  }

  const organizationId =
    appointment.unit?.organizationId ??
    appointment.service.unit.organizationId;

  if (!organizationId) {
    return NextResponse.json(
      { message: "Organização não encontrada para este atendimento." },
      { status: 400 },
    );
  }

  if (appointment.review) {
    return NextResponse.json(
      { message: "Você já avaliou este atendimento." },
      { status: 409 },
    );
  }

  const blocked = canLeaveReview(appointment);
  if (blocked) {
    return NextResponse.json({ message: blocked }, { status: 409 });
  }

  const comment =
    parsed.data.comment && parsed.data.comment.trim().length > 0
      ? parsed.data.comment.trim()
      : null;

  const result = await prisma.$transaction(async (tx) => {
    const review = await tx.organizationReview.create({
      data: {
        organizationId,
        appointmentId: appointment.id,
        rating: parsed.data.rating,
        comment,
        clientName: appointment.clientName,
        clientPhone: appointment.clientPhone,
      },
    });

    const agg = await tx.organizationReview.aggregate({
      where: { organizationId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await tx.organization.update({
      where: { id: organizationId },
      data: {
        ratingAvg: agg._avg.rating ?? null,
        ratingCount: agg._count._all,
      },
    });

    if (appointment.status === "CONFIRMED") {
      await tx.appointment.update({
        where: { id: appointment.id },
        data: { status: "COMPLETED" },
      });
    }

    return review;
  });

  return NextResponse.json({
    ok: true,
    review: {
      id: result.id,
      rating: result.rating,
    },
  });
}

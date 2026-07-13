import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(400).optional().nullable(),
  price: z.number().positive(),
  cycleDays: z.number().int().min(7).max(365).default(30),
  visitsIncluded: z.number().int().positive().nullable().optional(),
  serviceIds: z.array(z.string().min(1)).default([]),
});

export async function GET() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.manageSubscriptions) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const plans = await prisma.subscriptionPlan.findMany({
    where: { organizationId: auth.access.organizationId },
    include: {
      services: { select: { serviceId: true, service: { select: { id: true, name: true } } } },
      _count: { select: { subscriptions: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ plans });
}

export async function POST(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.manageSubscriptions) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

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

  if (parsed.data.serviceIds.length > 0) {
    const okCount = await prisma.service.count({
      where: {
        id: { in: parsed.data.serviceIds },
        unit: { organizationId: auth.access.organizationId },
      },
    });
    if (okCount !== parsed.data.serviceIds.length) {
      return NextResponse.json(
        { message: "Um ou mais serviços não pertencem à sua barbearia." },
        { status: 400 },
      );
    }
  }

  try {
    const plan = await prisma.subscriptionPlan.create({
      data: {
        organizationId: auth.access.organizationId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        price: parsed.data.price,
        cycleDays: parsed.data.cycleDays,
        visitsIncluded: parsed.data.visitsIncluded ?? null,
        services: {
          create: parsed.data.serviceIds.map((serviceId) => ({ serviceId })),
        },
      },
      include: { services: true },
    });
    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    console.error("POST subscription-plans", error);
    return NextResponse.json(
      { message: "Não foi possível criar o plano (nome duplicado?)." },
      { status: 500 },
    );
  }
}

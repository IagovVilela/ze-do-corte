import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  planId: z.string().min(1),
  clientName: z.string().trim().min(2).max(80),
  clientPhone: z.string().trim().min(8).max(32),
  clientEmail: z.string().trim().email().optional().or(z.literal("")),
  notes: z.string().trim().max(240).optional().nullable(),
});

export async function GET() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.manageSubscriptions) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const subscriptions = await prisma.clientSubscription.findMany({
    where: { organizationId: auth.access.organizationId },
    include: {
      plan: { select: { id: true, name: true, price: true, cycleDays: true, visitsIncluded: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ subscriptions });
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

  const plan = await prisma.subscriptionPlan.findFirst({
    where: {
      id: parsed.data.planId,
      organizationId: auth.access.organizationId,
      isActive: true,
    },
  });
  if (!plan) {
    return NextResponse.json({ message: "Plano inválido." }, { status: 400 });
  }

  const currentPeriodEnd = new Date();
  currentPeriodEnd.setDate(currentPeriodEnd.getDate() + plan.cycleDays);

  const subscription = await prisma.clientSubscription.create({
    data: {
      organizationId: auth.access.organizationId,
      planId: plan.id,
      clientName: parsed.data.clientName,
      clientPhone: parsed.data.clientPhone,
      clientEmail: parsed.data.clientEmail || null,
      notes: parsed.data.notes ?? null,
      status: "ACTIVE",
      currentPeriodEnd,
    },
    include: { plan: { select: { name: true } } },
  });

  return NextResponse.json({ subscription }, { status: 201 });
}

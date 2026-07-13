import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(400).nullable().optional(),
  price: z.number().positive().optional(),
  cycleDays: z.number().int().min(7).max(365).optional(),
  visitsIncluded: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.manageSubscriptions) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await prisma.subscriptionPlan.findFirst({
    where: { id, organizationId: auth.access.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ message: "Plano não encontrado." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const plan = await prisma.subscriptionPlan.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json({ plan });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.manageSubscriptions) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await prisma.subscriptionPlan.findFirst({
    where: { id, organizationId: auth.access.organizationId },
    include: { _count: { select: { subscriptions: true } } },
  });
  if (!existing) {
    return NextResponse.json({ message: "Plano não encontrado." }, { status: 404 });
  }

  if (existing._count.subscriptions > 0) {
    await prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({
      ok: true,
      deactivated: true,
      message: "Plano desativado (há assinantes).",
    });
  }

  await prisma.subscriptionPlan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

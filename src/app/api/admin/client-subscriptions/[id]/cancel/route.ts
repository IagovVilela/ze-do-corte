import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const cancelSchema = z.object({
  reason: z.string().trim().max(240).optional().nullable(),
});

/**
 * Cancelamento claro e imediato — anti-padrão App Barber.
 * POST /api/admin/client-subscriptions/[id]/cancel
 */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.manageSubscriptions) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await prisma.clientSubscription.findFirst({
    where: { id, organizationId: auth.access.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ message: "Assinatura não encontrada." }, { status: 404 });
  }

  if (existing.status === "CANCELLED") {
    return NextResponse.json({ subscription: existing });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = cancelSchema.safeParse(body);
  const reason = parsed.success ? parsed.data.reason : null;

  const subscription = await prisma.clientSubscription.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: reason?.trim() || "Cancelado pelo painel",
    },
    include: { plan: { select: { name: true } } },
  });

  return NextResponse.json({
    subscription,
    message: "Assinatura cancelada. Sem cobranças futuras neste clube.",
  });
}

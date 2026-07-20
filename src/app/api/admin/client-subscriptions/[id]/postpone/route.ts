import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { postponeClubSubscription } from "@/lib/club-subscription-actions";
import { hasProFeatures } from "@/lib/org-entitlements";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const postponeSchema = z.object({
  days: z.number().int().min(1).max(90),
});

/** POST /api/admin/client-subscriptions/[id]/postpone — body: { days: 1..90 } */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.manageSubscriptions) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: auth.access.organizationId },
    select: { planStatus: true, planTier: true, trialEndsAt: true },
  });
  if (!org || !hasProFeatures(org)) {
    return NextResponse.json(
      { message: "Clube disponível no plano Pro (ou trial)." },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const parsed = postponeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Informe days entre 1 e 90." },
      { status: 400 },
    );
  }

  const result = await postponeClubSubscription({
    organizationId: auth.access.organizationId,
    subscriptionId: id,
    days: parsed.data.days,
  });

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({
    subscription: result.subscription,
    message: result.message,
  });
}

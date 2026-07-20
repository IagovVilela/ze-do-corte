import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { pauseClubSubscription } from "@/lib/club-subscription-actions";
import { hasProFeatures } from "@/lib/org-entitlements";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const pauseSchema = z.object({
  reason: z.string().trim().max(240).optional().nullable(),
});

/** POST /api/admin/client-subscriptions/[id]/pause */
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
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = pauseSchema.safeParse(body);
  const reason = parsed.success ? parsed.data.reason : null;

  const result = await pauseClubSubscription({
    organizationId: auth.access.organizationId,
    subscriptionId: id,
    reason,
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

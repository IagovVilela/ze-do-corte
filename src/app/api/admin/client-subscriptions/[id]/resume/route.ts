import { NextResponse } from "next/server";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { resumeClubSubscription } from "@/lib/club-subscription-actions";
import { hasProFeatures } from "@/lib/org-entitlements";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/admin/client-subscriptions/[id]/resume */
export async function POST(_request: Request, context: RouteContext) {
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
  const result = await resumeClubSubscription({
    organizationId: auth.access.organizationId,
    subscriptionId: id,
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

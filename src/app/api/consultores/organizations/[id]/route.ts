import { NextResponse } from "next/server";

import { requireConsultantApiAuth } from "@/lib/consultant-auth";
import { prisma } from "@/lib/prisma";
import { planStatusLabel, planTierLabel } from "@/lib/org-entitlements";
import {
  logSupportAccess,
  SUPPORT_CONSULTANT_ORG_SLUG,
} from "@/lib/support-consultant";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const auth = await requireConsultantApiAuth();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const org = await prisma.organization.findFirst({
    where: { id, slug: { not: SUPPORT_CONSULTANT_ORG_SLUG } },
    select: {
      id: true,
      name: true,
      slug: true,
      planStatus: true,
      planTier: true,
      trialEndsAt: true,
      asaasEnabled: true,
      whatsappBotEnabled: true,
      whatsappConnectedAt: true,
      marketplaceListed: true,
      units: {
        where: { isDefault: true },
        select: { city: true },
        take: 1,
      },
    },
  });
  if (!org) {
    return NextResponse.json({ message: "Barbearia não encontrada." }, { status: 404 });
  }

  await logSupportAccess({
    consultantStaffId: auth.access.userId,
    organizationId: org.id,
    action: "VIEW_ORG",
  });

  return NextResponse.json({
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      city: org.units[0]?.city ?? null,
      planStatus: org.planStatus,
      planStatusLabel: planStatusLabel(org.planStatus),
      planTier: org.planTier,
      planTierLabel: planTierLabel(org.planTier),
      trialEndsAt: org.trialEndsAt,
      asaasEnabled: org.asaasEnabled,
      whatsappConnected: Boolean(org.whatsappConnectedAt || org.whatsappBotEnabled),
      marketplaceListed: org.marketplaceListed,
    },
  });
}

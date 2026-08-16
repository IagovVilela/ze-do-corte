import { NextResponse } from "next/server";

import { requireConsultantApiAuth } from "@/lib/consultant-auth";
import { prisma } from "@/lib/prisma";
import { planStatusLabel, planTierLabel } from "@/lib/org-entitlements";
import { SUPPORT_CONSULTANT_ORG_SLUG } from "@/lib/support-consultant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireConsultantApiAuth();
  if (!auth.ok) return auth.response;

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  const organizations = await prisma.organization.findMany({
    where: {
      slug: { not: SUPPORT_CONSULTANT_ORG_SLUG },
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: 100,
    select: {
      id: true,
      name: true,
      slug: true,
      planStatus: true,
      planTier: true,
      asaasEnabled: true,
      whatsappBotEnabled: true,
      whatsappConnectedAt: true,
    },
  });

  return NextResponse.json({
    organizations: organizations.map((o) => ({
      ...o,
      planStatusLabel: planStatusLabel(o.planStatus),
      planTierLabel: planTierLabel(o.planTier),
      whatsappConnected: Boolean(o.whatsappConnectedAt || o.whatsappBotEnabled),
    })),
  });
}

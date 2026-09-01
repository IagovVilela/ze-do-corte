import { NextResponse } from "next/server";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import {
  buildBreakEvenSnapshot,
  simulateBreakEven,
} from "@/lib/finance-break-even";
import { hasProFeatures } from "@/lib/org-entitlements";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.viewRevenue) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: auth.access.organizationId },
    select: { planStatus: true, planTier: true, trialEndsAt: true },
  });
  if (!org || !hasProFeatures(org)) {
    return NextResponse.json(
      { message: "Recurso disponível no plano Pro." },
      { status: 402 },
    );
  }

  const sp = new URL(request.url).searchParams;
  const yearMonth =
    sp.get("yearMonth") ??
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const unitId = sp.get("unitId") ?? undefined;
  const simulate = sp.get("simulate") === "1";
  const priceAdjustPercent = Number(sp.get("priceAdjustPercent") ?? 0);
  const productiveHours = sp.get("productiveHours");

  if (simulate) {
    const result = await simulateBreakEven({
      organizationId: auth.access.organizationId,
      yearMonth,
      unitId,
      priceAdjustPercent,
      productiveHours: productiveHours
        ? Number(productiveHours)
        : 156,
    });
    return NextResponse.json(result);
  }

  const snapshot = await buildBreakEvenSnapshot({
    organizationId: auth.access.organizationId,
    yearMonth,
    unitId,
  });

  return NextResponse.json(snapshot);
}

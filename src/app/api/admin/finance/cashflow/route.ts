import { NextResponse } from "next/server";
import { endOfDay, parseISO, startOfDay } from "date-fns";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import {
  autoSettleDueReceivables,
  buildCashFlowSnapshot,
} from "@/lib/finance-cashflow";
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

  await autoSettleDueReceivables(auth.access.organizationId);

  const sp = new URL(request.url).searchParams;
  const fromStr = sp.get("from");
  const toStr = sp.get("to");
  const unitId = sp.get("unitId") ?? undefined;
  const openingBalance = sp.get("openingBalance");

  const now = new Date();
  const from = fromStr ? startOfDay(parseISO(fromStr)) : startOfDay(now);
  const to = toStr
    ? endOfDay(parseISO(toStr))
    : endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const snapshot = await buildCashFlowSnapshot({
    organizationId: auth.access.organizationId,
    from,
    to,
    unitId,
    openingBalance: openingBalance ? Number(openingBalance) : 0,
  });

  return NextResponse.json(snapshot);
}

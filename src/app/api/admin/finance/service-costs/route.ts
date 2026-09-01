import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { hasProFeatures } from "@/lib/org-entitlements";
import { prisma } from "@/lib/prisma";
import {
  applySuggestedPrice,
  listServiceCostRows,
  upsertServiceCostProfile,
} from "@/lib/service-costing-admin";

export const dynamic = "force-dynamic";

async function requireProFinanceApi() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth;
  if (!auth.access.permissions.viewRevenue) {
    return {
      ok: false as const,
      response: NextResponse.json({ message: "Sem permissão." }, { status: 403 }),
    };
  }
  const org = await prisma.organization.findUnique({
    where: { id: auth.access.organizationId },
    select: { planStatus: true, planTier: true, trialEndsAt: true },
  });
  if (!org || !hasProFeatures(org)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { message: "Recurso disponível no plano Pro." },
        { status: 402 },
      ),
    };
  }
  return auth;
}

export async function GET(request: Request) {
  const auth = await requireProFinanceApi();
  if (!auth.ok) return auth.response;

  const sp = new URL(request.url).searchParams;
  const unitId = sp.get("unitId") ?? undefined;
  const variablePercent = sp.get("variablePercent");
  const profitPercent = sp.get("profitPercent");

  const data = await listServiceCostRows(auth.access.organizationId, {
    unitId,
    variablePercent: variablePercent ? Number(variablePercent) : undefined,
    profitPercent: profitPercent ? Number(profitPercent) : undefined,
  });

  return NextResponse.json(data);
}

const upsertSchema = z.object({
  serviceId: z.string().min(1),
  directLaborCost: z.number().min(0),
  materialCost: z.number().min(0),
  durationMinutesOverride: z.number().int().min(1).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function PUT(request: Request) {
  const auth = await requireProFinanceApi();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
  }

  await upsertServiceCostProfile(
    auth.access.organizationId,
    parsed.data.serviceId,
    parsed.data,
  );

  const data = await listServiceCostRows(auth.access.organizationId);
  return NextResponse.json(data);
}

const applySchema = z.object({
  serviceId: z.string().min(1),
  price: z.number().min(0),
});

export async function POST(request: Request) {
  const auth = await requireProFinanceApi();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
  }

  await applySuggestedPrice(
    auth.access.organizationId,
    parsed.data.serviceId,
    parsed.data.price,
  );

  const data = await listServiceCostRows(auth.access.organizationId);
  return NextResponse.json(data);
}

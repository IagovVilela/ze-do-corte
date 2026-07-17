import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { createClubSubscription } from "@/lib/club-subscribe";
import { hasProFeatures } from "@/lib/org-entitlements";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  planId: z.string().min(1),
  clientName: z.string().trim().min(2).max(80),
  clientPhone: z.string().trim().min(8).max(32),
  clientEmail: z.string().trim().email().optional().or(z.literal("")),
  clientCpfCnpj: z.string().trim().min(11).max(18).optional().or(z.literal("")),
  notes: z.string().trim().max(240).optional().nullable(),
  chargeOnline: z.boolean().optional(),
});

async function assertProClubAccess(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { planStatus: true, planTier: true, trialEndsAt: true },
  });
  if (!org || !hasProFeatures(org)) {
    return NextResponse.json(
      {
        message:
          "Clube disponível no plano Pro (ou durante o trial). Faça upgrade em Plano.",
      },
      { status: 403 },
    );
  }
  return null;
}

export async function GET() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.manageSubscriptions) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }
  const denied = await assertProClubAccess(auth.access.organizationId);
  if (denied) return denied;

  const subscriptions = await prisma.clientSubscription.findMany({
    where: { organizationId: auth.access.organizationId },
    include: {
      plan: {
        select: {
          id: true,
          name: true,
          price: true,
          cycleDays: true,
          visitsIncluded: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ subscriptions });
}

export async function POST(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.manageSubscriptions) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }
  const denied = await assertProClubAccess(auth.access.organizationId);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const result = await createClubSubscription({
    organizationId: auth.access.organizationId,
    planId: parsed.data.planId,
    clientName: parsed.data.clientName,
    clientPhone: parsed.data.clientPhone,
    clientEmail: parsed.data.clientEmail || null,
    clientCpfCnpj: parsed.data.clientCpfCnpj || null,
    notes: parsed.data.notes ?? null,
    chargeOnline: parsed.data.chargeOnline,
  });

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json(
    {
      subscription: result.subscription,
      invoiceUrl: result.invoiceUrl,
      pix: result.pix,
      asaasSubscriptionId: result.asaasSubscriptionId,
      chargedOnline: result.chargedOnline,
      message: result.message,
    },
    { status: 201 },
  );
}

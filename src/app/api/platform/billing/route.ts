import { NextResponse } from "next/server";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Stub de billing da plataforma Barbernegon (assinatura do dono).
 * Gateway real (Asaas/Stripe) entra depois — aqui só status + intenção de upgrade.
 */
export async function GET() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  const org = await prisma.organization.findUnique({
    where: { id: auth.access.organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      planStatus: true,
      trialEndsAt: true,
    },
  });

  return NextResponse.json({
    billing: {
      provider: "stub",
      organization: org,
      plans: [
        { id: "starter", name: "Starter", priceMonthly: 79 },
        { id: "pro", name: "Pro", priceMonthly: 129 },
      ],
      message:
        "Gateway de pagamento da plataforma ainda não conectado. Trial ativo libera o produto.",
    },
  });
}

export async function POST() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (auth.access.role !== "OWNER") {
    return NextResponse.json({ message: "Apenas o proprietário." }, { status: 403 });
  }

  const org = await prisma.organization.update({
    where: { id: auth.access.organizationId },
    data: {
      // Stub: marca interesse em upgrade mantendo TRIAL/ACTIVE
      planStatus: "ACTIVE",
    },
    select: { id: true, planStatus: true, slug: true },
  });

  return NextResponse.json({
    ok: true,
    organization: org,
    message:
      "Upgrade registrado (stub). Quando o gateway estiver ativo, a cobrança será iniciada aqui.",
  });
}

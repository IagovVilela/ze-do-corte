import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import {
  parseCommissionTiers,
  type CommissionTier,
} from "@/lib/commission-tiers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const tierSchema = z.object({
  minRevenue: z.number().finite().min(0),
  servicePercent: z.number().finite().min(0).max(100),
});

const upsertSchema = z.object({
  staffMemberId: z.string().min(1),
  servicePercent: z.number().finite().min(0).max(100).optional(),
  subscriptionPercent: z.number().finite().min(0).max(100).optional(),
  productPercent: z.number().finite().min(0).max(100).optional(),
  tiers: z.array(tierSchema).max(12).optional(),
});

export async function GET() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.viewRevenue) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const staff = await prisma.staffMember.findMany({
    where: {
      organizationId: auth.access.organizationId,
      role: "STAFF",
    },
    select: {
      id: true,
      displayName: true,
      email: true,
      commissionRule: true,
    },
    orderBy: [{ displayName: "asc" }, { email: "asc" }],
  });

  return NextResponse.json({
    rules: staff.map((s) => ({
      staffMemberId: s.id,
      professionalName: s.displayName?.trim() || s.email,
      servicePercent: Number(s.commissionRule?.servicePercent ?? 50),
      subscriptionPercent: Number(s.commissionRule?.subscriptionPercent ?? 30),
      productPercent: Number(s.commissionRule?.productPercent ?? 10),
      tiers: parseCommissionTiers(s.commissionRule?.tiersJson),
    })),
  });
}

export async function PUT(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.viewRevenue) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const staff = await prisma.staffMember.findFirst({
    where: {
      id: parsed.data.staffMemberId,
      organizationId: auth.access.organizationId,
      role: "STAFF",
    },
    select: { id: true },
  });
  if (!staff) {
    return NextResponse.json(
      { message: "Profissional inválido." },
      { status: 400 },
    );
  }

  const tiers: CommissionTier[] | undefined =
    parsed.data.tiers !== undefined
      ? parseCommissionTiers(parsed.data.tiers)
      : undefined;

  const rule = await prisma.staffCommissionRule.upsert({
    where: { staffMemberId: parsed.data.staffMemberId },
    create: {
      organizationId: auth.access.organizationId,
      staffMemberId: parsed.data.staffMemberId,
      servicePercent: parsed.data.servicePercent ?? 50,
      subscriptionPercent: parsed.data.subscriptionPercent ?? 30,
      productPercent: parsed.data.productPercent ?? 10,
      tiersJson: tiers ?? [],
    },
    update: {
      ...(parsed.data.servicePercent !== undefined
        ? { servicePercent: parsed.data.servicePercent }
        : {}),
      ...(parsed.data.subscriptionPercent !== undefined
        ? { subscriptionPercent: parsed.data.subscriptionPercent }
        : {}),
      ...(parsed.data.productPercent !== undefined
        ? { productPercent: parsed.data.productPercent }
        : {}),
      ...(tiers !== undefined ? { tiersJson: tiers } : {}),
    },
  });

  return NextResponse.json({
    ok: true,
    rule: {
      staffMemberId: rule.staffMemberId,
      servicePercent: Number(rule.servicePercent),
      subscriptionPercent: Number(rule.subscriptionPercent),
      productPercent: Number(rule.productPercent),
      tiers: parseCommissionTiers(rule.tiersJson),
    },
  });
}

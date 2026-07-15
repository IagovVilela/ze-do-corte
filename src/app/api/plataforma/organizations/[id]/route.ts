import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePlatformApiAuth } from "@/lib/platform-auth";
import { getPlatformOrganizationDetail } from "@/lib/platform-ops";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  planStatus: z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "CANCELLED"]).optional(),
  planTier: z.enum(["TRIAL_FULL", "STARTER", "PRO"]).optional(),
  trialEndsAt: z.union([z.iso.datetime(), z.null()]).optional(),
  marketplaceListed: z.boolean().optional(),
});

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requirePlatformApiAuth();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const organization = await getPlatformOrganizationDetail(id);
  if (!organization) {
    return NextResponse.json({ message: "Organização não encontrada." }, { status: 404 });
  }
  return NextResponse.json({ organization });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requirePlatformApiAuth();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const data = parsed.data;
  if (
    data.planStatus === undefined &&
    data.planTier === undefined &&
    data.trialEndsAt === undefined &&
    data.marketplaceListed === undefined
  ) {
    return NextResponse.json({ message: "Nada para atualizar." }, { status: 400 });
  }

  const existing = await prisma.organization.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ message: "Organização não encontrada." }, { status: 404 });
  }

  const update: Prisma.OrganizationUpdateInput = {
    ...(data.planStatus !== undefined ? { planStatus: data.planStatus } : {}),
    ...(data.planTier !== undefined ? { planTier: data.planTier } : {}),
    ...(data.marketplaceListed !== undefined
      ? { marketplaceListed: data.marketplaceListed }
      : {}),
    ...(data.trialEndsAt !== undefined
      ? {
          trialEndsAt:
            data.trialEndsAt === null ? null : new Date(data.trialEndsAt),
        }
      : {}),
  };

  await prisma.organization.update({ where: { id }, data: update });
  const organization = await getPlatformOrganizationDetail(id);
  return NextResponse.json({ organization });
}

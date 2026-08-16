import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { countWinbacksThisMonth, listWinbackCandidates } from "@/lib/client-profile";
import { hasPlusFeatures, settleOrgBillingState } from "@/lib/org-entitlements";
import { prisma } from "@/lib/prisma";
import { sendWinbackTemplate } from "@/lib/whatsapp-winback";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  const org = await settleOrgBillingState(auth.access.organizationId);
  if (!org || !hasPlusFeatures(org)) {
    return NextResponse.json(
      {
        message: "Fila de reativação faz parte do Plus+.",
        code: "PLUS_REQUIRED",
      },
      { status: 403 },
    );
  }

  const full = await prisma.organization.findUnique({
    where: { id: auth.access.organizationId },
    select: { whatsappWinbackMonthlyCap: true },
  });
  const candidates = await listWinbackCandidates(auth.access.organizationId);
  const used = await countWinbacksThisMonth(auth.access.organizationId);
  return NextResponse.json({
    candidates,
    usedThisMonth: used,
    monthlyCap: full?.whatsappWinbackMonthlyCap ?? 30,
    templateConfigured: Boolean(process.env.META_WA_TEMPLATE_WINBACK?.trim()),
  });
}

const postSchema = z.object({
  phoneKey: z.string().min(10).max(20),
});

export async function POST(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (auth.access.role !== "OWNER" && auth.access.role !== "ADMIN") {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const org = await settleOrgBillingState(auth.access.organizationId);
  if (!org || !hasPlusFeatures(org)) {
    return NextResponse.json(
      { message: "Assine o Plus+ para reativar pelo WhatsApp." },
      { status: 403 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ message: "Telefone inválido." }, { status: 400 });
  }

  const result = await sendWinbackTemplate({
    organizationId: auth.access.organizationId,
    phoneKey: parsed.data.phoneKey,
  });
  if (!result.ok) {
    return NextResponse.json(
      { message: result.message, code: result.code },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}

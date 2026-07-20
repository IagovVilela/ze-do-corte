import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createClubSubscription,
  listPublicClubPlans,
  orgClubPublicAvailable,
} from "@/lib/club-subscribe";
import { getOrganizationBySlug, isReservedSlug } from "@/lib/organization";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

const joinSchema = z.object({
  planId: z.string().min(1),
  clientName: z.string().trim().min(2).max(80),
  clientPhone: z.string().trim().min(8).max(32),
  clientEmail: z.string().trim().email().optional().or(z.literal("")),
  clientCpfCnpj: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 11 || v.length === 14, {
      message: "Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).",
    }),
  billingType: z.enum(["PIX", "CREDIT_CARD"]).optional().default("PIX"),
});

/**
 * GET /api/public/club/[slug] — planos públicos do clube.
 * POST /api/public/club/[slug] — adesão + PIX ou cartão.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  if (isReservedSlug(slug)) {
    return NextResponse.json({ message: "Não encontrado." }, { status: 404 });
  }
  const org = await getOrganizationBySlug(slug);
  if (!org) {
    return NextResponse.json({ message: "Não encontrado." }, { status: 404 });
  }

  const avail = await orgClubPublicAvailable(org.id);
  if (!avail.ok) {
    return NextResponse.json(
      { available: false, message: avail.message, plans: [] },
      { status: 200 },
    );
  }

  const plans = await listPublicClubPlans(org.id);
  return NextResponse.json({
    available: true,
    organization: { name: org.name, slug: org.slug },
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      priceLabel: formatMoney(Number(p.price)),
      cycleDays: p.cycleDays,
      visitsIncluded: p.visitsIncluded,
      services: p.services.map((s) => s.service.name),
    })),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  if (isReservedSlug(slug)) {
    return NextResponse.json({ message: "Não encontrado." }, { status: 404 });
  }
  const org = await getOrganizationBySlug(slug);
  if (!org) {
    return NextResponse.json({ message: "Não encontrado." }, { status: 404 });
  }

  const avail = await orgClubPublicAvailable(org.id);
  if (!avail.ok) {
    return NextResponse.json({ message: avail.message }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const result = await createClubSubscription({
    organizationId: org.id,
    planId: parsed.data.planId,
    clientName: parsed.data.clientName,
    clientPhone: parsed.data.clientPhone,
    clientEmail: parsed.data.clientEmail || null,
    clientCpfCnpj: parsed.data.clientCpfCnpj,
    chargeOnline: true,
    billingType: parsed.data.billingType,
  });

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      message: result.message,
      subscriptionId: result.subscription.id,
      status: result.subscription.status,
      billingType: result.billingType,
      invoiceUrl: result.invoiceUrl,
      pix: result.pix,
      bookHref: `/${org.slug}/agendar`,
    },
    { status: 201 },
  );
}

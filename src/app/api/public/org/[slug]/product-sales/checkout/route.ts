import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AsaasApiError,
  asaasCreateCustomer,
  asaasCreatePayment,
  asaasFindCustomerByExternalRef,
  asaasGetPixQrCode,
  todayIsoDate,
} from "@/lib/asaas-client";
import { getOrgAsaasApiKey } from "@/lib/asaas-org";
import { productSaleExternalRef } from "@/lib/asaas-plans";
import { getOrganizationBySlug, isReservedSlug } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import {
  createOnlineProductSalePending,
  markProductSaleFailed,
} from "@/lib/product-sales";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

const checkoutSchema = z.object({
  clientName: z.string().trim().min(2).max(120),
  clientPhone: z.string().trim().min(8).max(32),
  clientEmail: z.string().trim().email().max(160).optional().or(z.literal("")),
  cpfCnpj: z.string().trim().min(11).max(18).optional().or(z.literal("")),
  lines: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(20),
});

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  if (isReservedSlug(slug)) {
    return NextResponse.json({ message: "Não encontrado." }, { status: 404 });
  }
  const org = await getOrganizationBySlug(slug);
  if (!org) {
    return NextResponse.json({ message: "Não encontrado." }, { status: 404 });
  }

  const apiKey = await getOrgAsaasApiKey(org.id);
  if (!apiKey) {
    return NextResponse.json(
      { message: "Esta barbearia ainda não está recebendo PIX online." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  let sale: Awaited<ReturnType<typeof createOnlineProductSalePending>>;
  try {
    sale = await createOnlineProductSalePending({
      organizationId: org.id,
      lines: parsed.data.lines,
      clientName: parsed.data.clientName,
      clientPhone: parsed.data.clientPhone,
      clientEmail: parsed.data.clientEmail || null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível criar o pedido.";
    return NextResponse.json({ message }, { status: 400 });
  }

  const phoneDigits = parsed.data.clientPhone.replace(/\D/g, "");
  const customerRef = `psale_customer:${org.id}:${phoneDigits}`;

  try {
    let customer = await asaasFindCustomerByExternalRef(apiKey, customerRef);
    if (!customer) {
      customer = await asaasCreateCustomer(apiKey, {
        name: parsed.data.clientName,
        email: parsed.data.clientEmail || null,
        mobilePhone: phoneDigits.slice(-11),
        cpfCnpj: parsed.data.cpfCnpj || null,
        externalReference: customerRef,
      });
    }

    const itemNames = sale.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ");
    const payment = await asaasCreatePayment(apiKey, {
      customer: customer.id,
      billingType: "PIX",
      value: sale.amountTotal,
      dueDate: todayIsoDate(),
      description: `Loja · ${itemNames}`.slice(0, 200),
      externalReference: productSaleExternalRef(sale.id),
    });

    await prisma.productSale.update({
      where: { id: sale.id },
      data: { asaasPaymentId: payment.id },
    });

    const pix = await asaasGetPixQrCode(apiKey, payment.id);

    return NextResponse.json({
      ok: true,
      saleId: sale.id,
      manageToken: sale.manageToken,
      amountTotal: sale.amountTotal,
      paymentId: payment.id,
      invoiceUrl: payment.invoiceUrl ?? null,
      pix: {
        encodedImage: pix.encodedImage ?? null,
        payload: pix.payload ?? null,
        expirationDate: pix.expirationDate ?? null,
      },
    });
  } catch (error) {
    console.error("POST product-sales/checkout", error);
    // Libera estoque se o PIX falhou após a reserva.
    await markProductSaleFailed(sale.id);
    const message =
      error instanceof AsaasApiError
        ? error.message
        : "Não foi possível gerar o PIX.";
    return NextResponse.json({ message }, { status: 502 });
  }
}

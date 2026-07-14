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
import { apptExternalRef } from "@/lib/asaas-plans";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const postSchema = z.object({
  manageToken: z.string().trim().min(8).max(64),
  cpfCnpj: z.string().trim().min(11).max(18).optional().or(z.literal("")),
});

/**
 * Gera cobrança PIX na conta Asaas do salão para um agendamento.
 * POST /api/appointments/[id]/pay-pix
 */
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const appointment = await prisma.appointment.findFirst({
    where: {
      id,
      clientManageToken: parsed.data.manageToken,
      status: { in: ["CONFIRMED", "COMPLETED"] },
    },
    include: {
      service: true,
      unit: { select: { organizationId: true } },
    },
  });

  if (!appointment?.unit) {
    return NextResponse.json({ message: "Agendamento não encontrado." }, { status: 404 });
  }

  if (appointment.paidAt || appointment.paymentStatus === "PAID") {
    return NextResponse.json({ message: "Este agendamento já está pago.", paid: true });
  }

  const organizationId = appointment.unit.organizationId;
  const apiKey = await getOrgAsaasApiKey(organizationId);
  if (!apiKey) {
    return NextResponse.json(
      { message: "Esta barbearia ainda não está recebendo PIX online." },
      { status: 503 },
    );
  }

  const override = await prisma.barbershopUnitService.findFirst({
    where: {
      unitId: appointment.unitId ?? undefined,
      serviceId: appointment.serviceId,
    },
    select: { price: true },
  });
  const price = Number(
    override?.price != null ? override.price : appointment.service.price,
  );
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ message: "Valor do serviço inválido." }, { status: 400 });
  }

  const customerRef = `appt_customer:${organizationId}:${appointment.clientPhone.replace(/\D/g, "")}`;

  try {
    let customer = await asaasFindCustomerByExternalRef(apiKey, customerRef);
    if (!customer) {
      customer = await asaasCreateCustomer(apiKey, {
        name: appointment.clientName,
        email: appointment.clientEmail,
        mobilePhone: appointment.clientPhone.replace(/\D/g, "").slice(-11),
        cpfCnpj: parsed.data.cpfCnpj || null,
        externalReference: customerRef,
      });
    }

    const payment = await asaasCreatePayment(apiKey, {
      customer: customer.id,
      billingType: "PIX",
      value: price,
      dueDate: todayIsoDate(),
      description: `Agendamento · ${appointment.service.name}`,
      externalReference: apptExternalRef(appointment.id),
    });

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        asaasPaymentId: payment.id,
        paymentStatus: "PENDING",
      },
    });

    const pix = await asaasGetPixQrCode(apiKey, payment.id);

    return NextResponse.json({
      ok: true,
      paymentId: payment.id,
      value: price,
      invoiceUrl: payment.invoiceUrl ?? null,
      pix: {
        encodedImage: pix.encodedImage ?? null,
        payload: pix.payload ?? null,
        expirationDate: pix.expirationDate ?? null,
      },
    });
  } catch (error) {
    console.error("POST pay-pix", error);
    const message =
      error instanceof AsaasApiError
        ? error.message
        : "Não foi possível gerar o PIX.";
    return NextResponse.json({ message }, { status: 502 });
  }
}

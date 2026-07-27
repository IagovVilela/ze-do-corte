import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { getAppointmentComanda } from "@/lib/admin-appointment-comanda";
import { prisma } from "@/lib/prisma";
import { appointmentScopeWhere } from "@/lib/staff-access";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const comanda = await getAppointmentComanda(auth.access, id);
  if (!comanda) {
    return NextResponse.json(
      { message: "Agendamento não encontrado." },
      { status: 404 },
    );
  }
  return NextResponse.json({ comanda });
}

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("addService"),
    serviceId: z.string().min(1),
  }),
  z.object({
    action: z.literal("addProduct"),
    productId: z.string().min(1),
    quantity: z.number().int().min(1).max(99).optional(),
  }),
  z.object({
    action: z.literal("removeProduct"),
    lineId: z.string().min(1),
  }),
  z.object({
    action: z.literal("markPaid"),
    paymentMethod: z.string().trim().min(1).max(32).optional(),
  }),
]);

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (auth.access.role === "STAFF") {
    return NextResponse.json(
      { message: "Sem permissão para editar a comanda." },
      { status: 403 },
    );
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
  }

  const appt = await prisma.appointment.findFirst({
    where: {
      AND: [appointmentScopeWhere(auth.access), { id }],
    },
    select: {
      id: true,
      unitId: true,
      endsAt: true,
      startsAt: true,
      status: true,
    },
  });
  if (!appt) {
    return NextResponse.json(
      { message: "Agendamento não encontrado." },
      { status: 404 },
    );
  }

  const action = parsed.data;

  try {
    switch (action.action) {
      case "addService": {
        const service = await prisma.service.findFirst({
          where: {
            id: action.serviceId,
            unit: { organizationId: auth.access.organizationId },
          },
          include: { unitOverrides: true },
        });
        if (!service) {
          return NextResponse.json(
            { message: "Serviço inválido." },
            { status: 400 },
          );
        }
        const ov = appt.unitId
          ? service.unitOverrides.find((o) => o.unitId === appt.unitId)
          : null;
        const duration =
          ov?.durationMinutes != null
            ? ov.durationMinutes
            : service.durationMinutes;
        const price = Number(ov?.price != null ? ov.price : service.price);
        const maxOrder = await prisma.appointmentItem.aggregate({
          where: { appointmentId: id },
          _max: { sortOrder: true },
        });
        await prisma.$transaction([
          prisma.appointmentItem.create({
            data: {
              appointmentId: id,
              serviceId: service.id,
              price,
              durationMinutes: duration,
              sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
            },
          }),
          prisma.appointment.update({
            where: { id },
            data: {
              endsAt: new Date(appt.endsAt.getTime() + duration * 60_000),
            },
          }),
        ]);
        break;
      }
      case "addProduct": {
        const qty = action.quantity ?? 1;
        const product = await prisma.product.findFirst({
          where: {
            id: action.productId,
            organizationId: auth.access.organizationId,
            isActive: true,
          },
        });
        if (!product) {
          return NextResponse.json(
            { message: "Produto inválido." },
            { status: 400 },
          );
        }
        if (product.stockQty != null && product.stockQty < qty) {
          return NextResponse.json(
            { message: "Estoque insuficiente." },
            { status: 400 },
          );
        }
        await prisma.$transaction(async (tx) => {
          await tx.appointmentProduct.create({
            data: {
              appointmentId: id,
              productId: product.id,
              quantity: qty,
              unitPrice: product.price,
            },
          });
          if (product.stockQty != null) {
            const balanceAfter = product.stockQty - qty;
            await tx.product.update({
              where: { id: product.id },
              data: { stockQty: balanceAfter },
            });
            await tx.productStockMovement.create({
              data: {
                organizationId: auth.access.organizationId,
                productId: product.id,
                kind: "SALE",
                quantityDelta: -qty,
                balanceAfter,
                note: `Comanda ${id}`,
                createdById: auth.access.userId,
              },
            });
          }
        });
        break;
      }
      case "removeProduct": {
        const line = await prisma.appointmentProduct.findFirst({
          where: { id: action.lineId, appointmentId: id },
        });
        if (!line) {
          return NextResponse.json(
            { message: "Item não encontrado." },
            { status: 404 },
          );
        }
        await prisma.$transaction(async (tx) => {
          await tx.appointmentProduct.delete({ where: { id: line.id } });
          const product = await tx.product.findUnique({
            where: { id: line.productId },
          });
          if (product?.stockQty != null) {
            const balanceAfter = product.stockQty + line.quantity;
            await tx.product.update({
              where: { id: product.id },
              data: { stockQty: balanceAfter },
            });
            await tx.productStockMovement.create({
              data: {
                organizationId: auth.access.organizationId,
                productId: product.id,
                kind: "IN",
                quantityDelta: line.quantity,
                balanceAfter,
                note: `Estorno comanda ${id}`,
                createdById: auth.access.userId,
              },
            });
          }
        });
        break;
      }
      case "markPaid": {
        const comanda = await getAppointmentComanda(auth.access, id);
        await prisma.appointment.update({
          where: { id },
          data: {
            paymentStatus: "PAID",
            paidAt: new Date(),
            paymentMethod: action.paymentMethod?.trim() || "Balcão",
            amountPaid: comanda?.grandTotal ?? 0,
            status: appt.status === "CONFIRMED" ? "COMPLETED" : appt.status,
          },
        });
        break;
      }
      default: {
        const _n: never = action;
        return _n;
      }
    }

    const comanda = await getAppointmentComanda(auth.access, id);
    return NextResponse.json({ comanda });
  } catch (error) {
    console.error("[comanda patch]", error);
    return NextResponse.json(
      { message: "Não foi possível atualizar a comanda." },
      { status: 500 },
    );
  }
}

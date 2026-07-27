import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("IN"),
    quantity: z.number().int().positive(),
    note: z.string().trim().max(200).optional(),
  }),
  z.object({
    kind: z.literal("OUT"),
    quantity: z.number().int().positive(),
    note: z.string().trim().max(200).optional(),
  }),
  z.object({
    kind: z.literal("ADJUST"),
    quantity: z.number().int().min(0),
    note: z.string().trim().max(200).optional(),
  }),
]);

export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (auth.access.role !== "OWNER" && auth.access.role !== "ADMIN") {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const product = await prisma.product.findFirst({
    where: { id, organizationId: auth.access.organizationId },
  });
  if (!product) {
    return NextResponse.json({ message: "Produto não encontrado." }, { status: 404 });
  }

  const current = product.stockQty ?? 0;
  let delta = 0;
  let balanceAfter = current;
  const kind = parsed.data.kind;

  switch (kind) {
    case "IN":
      delta = parsed.data.quantity;
      balanceAfter = current + delta;
      break;
    case "OUT":
      if (current < parsed.data.quantity) {
        return NextResponse.json(
          { message: `Estoque insuficiente (atual: ${current}).` },
          { status: 400 },
        );
      }
      delta = -parsed.data.quantity;
      balanceAfter = current + delta;
      break;
    case "ADJUST":
      delta = parsed.data.quantity - current;
      balanceAfter = parsed.data.quantity;
      break;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const p = await tx.product.update({
      where: { id },
      data: { stockQty: balanceAfter },
    });
    await tx.productStockMovement.create({
      data: {
        organizationId: auth.access.organizationId,
        productId: id,
        kind,
        quantityDelta: delta,
        balanceAfter,
        note: parsed.data.note ?? null,
        createdById: auth.access.userId,
      },
    });
    return p;
  });

  return NextResponse.json({
    product: {
      id: updated.id,
      name: updated.name,
      price: Number(updated.price),
      isActive: updated.isActive,
      stockQty: updated.stockQty,
      stockMin: updated.stockMin,
    },
  });
}

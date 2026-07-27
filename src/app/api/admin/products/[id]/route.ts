import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  price: z.number().finite().nonnegative().optional(),
  stockQty: z.number().int().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (auth.access.role !== "OWNER" && auth.access.role !== "ADMIN") {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
  }

  const existing = await prisma.product.findFirst({
    where: { id, organizationId: auth.access.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ message: "Produto não encontrado." }, { status: 404 });
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(parsed.data.name != null ? { name: parsed.data.name } : {}),
      ...(parsed.data.price != null ? { price: parsed.data.price } : {}),
      ...(parsed.data.stockQty !== undefined
        ? { stockQty: parsed.data.stockQty }
        : {}),
      ...(parsed.data.isActive != null ? { isActive: parsed.data.isActive } : {}),
    },
  });

  return NextResponse.json({
    product: {
      id: product.id,
      name: product.name,
      price: Number(product.price),
      isActive: product.isActive,
      stockQty: product.stockQty,
    },
  });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (auth.access.role !== "OWNER" && auth.access.role !== "ADMIN") {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.product.findFirst({
    where: { id, organizationId: auth.access.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ message: "Produto não encontrado." }, { status: 404 });
  }

  await prisma.product.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}

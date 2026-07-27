import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  const products = await prisma.product.findMany({
    where: { organizationId: auth.access.organizationId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      isActive: p.isActive,
      stockQty: p.stockQty,
    })),
  });
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  price: z.number().finite().nonnegative(),
  stockQty: z.number().int().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function POST(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (
    auth.access.role !== "OWNER" &&
    auth.access.role !== "ADMIN" &&
    !auth.access.permissions.manageServices
  ) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
  }

  try {
    const product = await prisma.product.create({
      data: {
        organizationId: auth.access.organizationId,
        name: parsed.data.name,
        price: parsed.data.price,
        stockQty: parsed.data.stockQty ?? null,
        isActive: parsed.data.isActive ?? true,
      },
    });
    return NextResponse.json(
      {
        product: {
          id: product.id,
          name: product.name,
          price: Number(product.price),
          isActive: product.isActive,
          stockQty: product.stockQty,
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { message: "Não foi possível criar o produto (nome duplicado?)." },
      { status: 400 },
    );
  }
}

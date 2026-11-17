import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import {
  createCounterProductSale,
  listAdminProductSales,
} from "@/lib/product-sales";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  const sales = await listAdminProductSales(auth.access.organizationId);
  return NextResponse.json({ sales });
}

const createSchema = z.object({
  paymentMethod: z.string().trim().min(1).max(32),
  clientName: z.string().trim().max(120).optional().or(z.literal("")),
  clientPhone: z.string().trim().max(32).optional().or(z.literal("")),
  note: z.string().trim().max(200).optional().or(z.literal("")),
  lines: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        quantity: z.number().int().min(1).max(999),
      }),
    )
    .min(1)
    .max(40),
});

export async function POST(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  try {
    const sale = await createCounterProductSale({
      organizationId: auth.access.organizationId,
      createdById: auth.access.userId,
      lines: parsed.data.lines,
      paymentMethod: parsed.data.paymentMethod,
      clientName: parsed.data.clientName || null,
      clientPhone: parsed.data.clientPhone || null,
      note: parsed.data.note || null,
    });
    return NextResponse.json({ sale }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível registrar a venda.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

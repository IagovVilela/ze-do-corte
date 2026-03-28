import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().min(2).optional(),
  addressLine: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.manageUnits) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const units = await prisma.barbershopUnit.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
  return NextResponse.json({ units });
}

export async function POST(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.manageUnits) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const slug = parsed.data.slug?.length
    ? slugify(parsed.data.slug)
    : slugify(parsed.data.name);

  const existing = await prisma.barbershopUnit.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { message: "Já existe uma unidade com este identificador (slug)." },
      { status: 409 },
    );
  }

  const isDefault = parsed.data.isDefault === true;

  const unit = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.barbershopUnit.updateMany({ data: { isDefault: false } });
    }
    return tx.barbershopUnit.create({
      data: {
        name: parsed.data.name.trim(),
        slug,
        addressLine: parsed.data.addressLine?.trim() || null,
        city: parsed.data.city?.trim() || null,
        phone: parsed.data.phone?.trim() || null,
        isActive: parsed.data.isActive !== false,
        isDefault,
      },
    });
  });

  return NextResponse.json({ unit }, { status: 201 });
}

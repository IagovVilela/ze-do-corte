import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { normalizeBrProfilePhone } from "@/lib/br-phone-format";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().trim().min(2).optional(),
  slug: z.string().trim().min(2).optional(),
  addressLine: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.manageUnits) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const d = parsed.data;
  const touchesCadastro =
    d.name !== undefined ||
    d.slug !== undefined ||
    d.addressLine !== undefined ||
    d.city !== undefined ||
    d.phone !== undefined;
  if (touchesCadastro && auth.access.role !== "OWNER") {
    return NextResponse.json(
      {
        message:
          "Apenas o proprietário pode alterar nome, slug, endereço, cidade ou telefone da unidade.",
      },
      { status: 403 },
    );
  }

  const current = await prisma.barbershopUnit.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ message: "Unidade não encontrada." }, { status: 404 });
  }

  const nextSlug = parsed.data.slug ? slugify(parsed.data.slug) : undefined;
  if (nextSlug && nextSlug !== current.slug) {
    const taken = await prisma.barbershopUnit.findUnique({
      where: { slug: nextSlug },
    });
    if (taken) {
      return NextResponse.json({ message: "Slug já em uso." }, { status: 409 });
    }
  }

  const isDefault = parsed.data.isDefault;

  const unit = await prisma.$transaction(async (tx) => {
    if (isDefault === true) {
      await tx.barbershopUnit.updateMany({
        where: { NOT: { id } },
        data: { isDefault: false },
      });
    }
    return tx.barbershopUnit.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
        ...(parsed.data.addressLine !== undefined
          ? { addressLine: parsed.data.addressLine?.trim() || null }
          : {}),
        ...(parsed.data.city !== undefined
          ? { city: parsed.data.city?.trim() || null }
          : {}),
        ...(parsed.data.phone !== undefined
          ? { phone: normalizeBrProfilePhone(parsed.data.phone ?? "") }
          : {}),
        ...(parsed.data.isActive !== undefined
          ? { isActive: parsed.data.isActive }
          : {}),
        ...(isDefault !== undefined ? { isDefault } : {}),
      },
    });
  });

  return NextResponse.json({ unit });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (auth.access.role !== "OWNER") {
    return NextResponse.json(
      { message: "Apenas o proprietário pode remover unidades." },
      { status: 403 },
    );
  }

  const { id } = await context.params;

  const current = await prisma.barbershopUnit.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ message: "Unidade não encontrada." }, { status: 404 });
  }

  const apptCount = await prisma.appointment.count({ where: { unitId: id } });
  if (apptCount > 0) {
    return NextResponse.json(
      {
        message:
          "Não é possível excluir: existem agendamentos associados. Desative a unidade em vez disso.",
      },
      { status: 400 },
    );
  }

  await prisma.barbershopUnit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

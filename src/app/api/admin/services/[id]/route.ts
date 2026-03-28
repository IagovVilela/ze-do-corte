import type { ServiceCategory } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { SERVICE_CATEGORY_ORDER } from "@/lib/service-category";

export const dynamic = "force-dynamic";

const categoryZ = z.enum(SERVICE_CATEGORY_ORDER);

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().min(3).max(2000).optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  price: z.number().min(0).max(999_999).optional(),
  isActive: z.boolean().optional(),
  category: categoryZ.optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.manageServices) {
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

  const exists = await prisma.service.findUnique({ where: { id } });
  if (!exists) {
    return NextResponse.json({ message: "Serviço não encontrado." }, { status: 404 });
  }

  try {
    const service = await prisma.service.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.description !== undefined
          ? { description: parsed.data.description }
          : {}),
        ...(parsed.data.durationMinutes !== undefined
          ? { durationMinutes: parsed.data.durationMinutes }
          : {}),
        ...(parsed.data.price !== undefined ? { price: parsed.data.price } : {}),
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
        ...(parsed.data.category !== undefined
          ? { category: parsed.data.category as ServiceCategory }
          : {}),
      },
    });
    return NextResponse.json({
      service: {
        id: service.id,
        name: service.name,
        description: service.description,
        category: service.category,
        durationMinutes: service.durationMinutes,
        price: Number(service.price),
        isActive: service.isActive,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Nome de serviço duplicado ou dados inválidos." },
      { status: 409 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.manageServices) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const { id } = await context.params;

  const exists = await prisma.service.findUnique({ where: { id } });
  if (!exists) {
    return NextResponse.json({ message: "Serviço não encontrado." }, { status: 404 });
  }

  const apptCount = await prisma.appointment.count({ where: { serviceId: id } });
  if (apptCount > 0) {
    return NextResponse.json(
      {
        message:
          "Não é possível excluir: existem agendamentos ligados a este serviço. Desative-o em vez disso.",
      },
      { status: 400 },
    );
  }

  await prisma.service.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

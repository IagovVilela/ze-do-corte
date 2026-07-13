import type { ServiceCategory } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { SERVICE_CATEGORY_ORDER } from "@/lib/service-category";
import { serviceScopeWhere, unitScopeWhere } from "@/lib/staff-access";

export const dynamic = "force-dynamic";

const categoryZ = z.enum(SERVICE_CATEGORY_ORDER);

const patchSchema = z.object({
  unitId: z.string().min(1).optional(),
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().min(3).max(2000).optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  price: z.number().min(0).max(999_999).optional(),
  isActive: z.boolean().optional(),
  category: categoryZ.optional(),
  unitOverrides: z.array(z.object({
    unitId: z.string().min(1),
    price: z.number().min(0).max(999_999).nullable(),
    durationMinutes: z.number().int().min(5).max(480).nullable(),
    isActive: z.boolean(),
  })).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.manageServices) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const { id } = await context.params;
  const organizationId = auth.access.organizationId;

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

  const exists = await prisma.service.findFirst({
    where: { id, ...serviceScopeWhere(auth.access) },
  });
  if (!exists) {
    return NextResponse.json({ message: "Serviço não encontrado." }, { status: 404 });
  }

  if (parsed.data.unitId !== undefined) {
    const unitOk = await prisma.barbershopUnit.findFirst({
      where: {
        id: parsed.data.unitId,
        isActive: true,
        ...unitScopeWhere(auth.access),
      },
      select: { id: true },
    });
    if (!unitOk) {
      return NextResponse.json({ message: "Unidade inválida ou inativa." }, { status: 400 });
    }
  }

  if (parsed.data.unitOverrides && parsed.data.unitOverrides.length > 0) {
    const overrideUnitIds = [...new Set(parsed.data.unitOverrides.map((o) => o.unitId))];
    const overrideUnits = await prisma.barbershopUnit.findMany({
      where: {
        id: { in: overrideUnitIds },
        organizationId,
      },
      select: { id: true },
    });
    if (overrideUnits.length !== overrideUnitIds.length) {
      return NextResponse.json(
        { message: "Uma ou mais unidades de override não pertencem à organização." },
        { status: 400 },
      );
    }
  }

  try {
    const service = await prisma.service.update({
      where: { id },
      data: {
        ...(parsed.data.unitId !== undefined ? { unitId: parsed.data.unitId } : {}),
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
        ...(parsed.data.unitOverrides !== undefined ? {
          unitOverrides: {
            deleteMany: {},
            create: parsed.data.unitOverrides.map(o => ({
              unitId: o.unitId,
              price: o.price,
              durationMinutes: o.durationMinutes,
              isActive: o.isActive,
            }))
          }
        } : {})
      },
      include: {
        unit: { select: { name: true } },
        unitOverrides: true,
      },
    });
    return NextResponse.json({
      service: {
        id: service.id,
        unitId: service.unitId,
        unitName: service.unit.name,
        name: service.name,
        description: service.description,
        category: service.category,
        durationMinutes: service.durationMinutes,
        price: Number(service.price),
        isActive: service.isActive,
        unitOverrides: service.unitOverrides.map(o => ({
          unitId: o.unitId,
          price: o.price ? Number(o.price) : null,
          durationMinutes: o.durationMinutes,
          isActive: o.isActive,
        })),
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

  const exists = await prisma.service.findFirst({
    where: { id, ...serviceScopeWhere(auth.access) },
  });
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

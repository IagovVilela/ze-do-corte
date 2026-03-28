import type { ServiceCategory } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { SERVICE_CATEGORY_ORDER } from "@/lib/service-category";

export const dynamic = "force-dynamic";

const categoryZ = z.enum(SERVICE_CATEGORY_ORDER);

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(3).max(2000),
  durationMinutes: z.number().int().min(5).max(480),
  price: z.number().min(0).max(999_999),
  isActive: z.boolean().optional().default(true),
  category: categoryZ.optional().default("OUTRO"),
});

export async function GET() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.manageServices) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const services = await prisma.service.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      category: s.category,
      durationMinutes: s.durationMinutes,
      price: Number(s.price),
      isActive: s.isActive,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.manageServices) {
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

  const category = parsed.data.category as ServiceCategory;

  try {
    const service = await prisma.service.create({
      data: {
        name: parsed.data.name.trim(),
        description: parsed.data.description.trim(),
        durationMinutes: parsed.data.durationMinutes,
        price: parsed.data.price,
        isActive: parsed.data.isActive,
        category,
      },
    });
    return NextResponse.json(
      {
        service: {
          id: service.id,
          name: service.name,
          description: service.description,
          category: service.category,
          durationMinutes: service.durationMinutes,
          price: Number(service.price),
          isActive: service.isActive,
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { message: "Já existe um serviço com este nome." },
      { status: 409 },
    );
  }
}

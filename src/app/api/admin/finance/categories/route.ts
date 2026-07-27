import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import {
  ensureDefaultFinanceCategories,
  listFinanceCategories,
} from "@/lib/admin-finance";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.viewRevenue) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const kind = new URL(request.url).searchParams.get("kind");
  const categories = await listFinanceCategories(
    auth.access.organizationId,
    kind === "EXPENSE" || kind === "INCOME" ? kind : undefined,
  );
  return NextResponse.json({ categories });
}

const createSchema = z.object({
  kind: z.enum(["EXPENSE", "INCOME"]),
  name: z.string().trim().min(2).max(120),
  parentId: z.string().min(1).nullable().optional(),
});

export async function POST(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.viewRevenue) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  await ensureDefaultFinanceCategories(auth.access.organizationId);

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
  }

  if (parsed.data.parentId) {
    const parent = await prisma.financeCategory.findFirst({
      where: {
        id: parsed.data.parentId,
        organizationId: auth.access.organizationId,
        kind: parsed.data.kind,
      },
      select: { id: true },
    });
    if (!parent) {
      return NextResponse.json(
        { message: "Categoria pai inválida." },
        { status: 400 },
      );
    }
  }

  try {
    const category = await prisma.financeCategory.create({
      data: {
        organizationId: auth.access.organizationId,
        kind: parsed.data.kind,
        name: parsed.data.name,
        parentId: parsed.data.parentId ?? null,
      },
    });
    return NextResponse.json(
      {
        category: {
          id: category.id,
          kind: category.kind,
          name: category.name,
          parentId: category.parentId,
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { message: "Categoria já existe." },
      { status: 400 },
    );
  }
}

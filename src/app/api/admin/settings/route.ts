import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const putSchema = z.object({
  settings: z.record(z.string(), z.string().max(20_000)),
});

export async function GET() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.manageSettings) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const rows = await prisma.barbershopSetting.findMany({
    orderBy: { key: "asc" },
  });
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.manageSettings) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const entries = Object.entries(parsed.data.settings);
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.barbershopSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}

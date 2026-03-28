import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { canModifyStaffMember } from "@/lib/staff-access";
import {
  defaultWorkWeekFromShop,
  parseWorkWeekFromDb,
  validateWorkWeekAgainstShop,
  workSchedulePatchSchema,
  type WorkWeekState,
} from "@/lib/work-week";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (auth.access.permissions.manageStaff === "none") {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const { id } = await context.params;
  const target = await prisma.staffMember.findUnique({
    where: { id },
    select: { id: true, role: true, email: true, workWeekJson: true },
  });
  if (!target) {
    return NextResponse.json({ message: "Membro não encontrado." }, { status: 404 });
  }
  if (target.role !== "STAFF") {
    return NextResponse.json(
      { message: "Expediente personalizado aplica-se apenas a funcionários (barbeiros)." },
      { status: 400 },
    );
  }
  if (!canModifyStaffMember(auth.access, target)) {
    return NextResponse.json({ message: "Não pode consultar este expediente." }, { status: 403 });
  }

  const custom = parseWorkWeekFromDb(target.workWeekJson ?? null);
  const usesCustom = custom !== null;
  const defaults = defaultWorkWeekFromShop();
  const week: WorkWeekState = custom ?? defaults;

  return NextResponse.json({ usesCustom, week, defaults });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (auth.access.permissions.manageStaff === "none") {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const { id } = await context.params;
  const target = await prisma.staffMember.findUnique({
    where: { id },
    select: { id: true, role: true, email: true },
  });
  if (!target) {
    return NextResponse.json({ message: "Membro não encontrado." }, { status: 404 });
  }
  if (target.role !== "STAFF") {
    return NextResponse.json(
      { message: "Expediente personalizado aplica-se apenas a funcionários." },
      { status: 400 },
    );
  }
  if (!canModifyStaffMember(auth.access, target)) {
    return NextResponse.json({ message: "Não pode alterar este expediente." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const parsed = workSchedulePatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  if ("useShopDefault" in parsed.data && parsed.data.useShopDefault) {
    await prisma.staffMember.update({
      where: { id },
      data: { workWeekJson: Prisma.DbNull },
    });
    return NextResponse.json({ ok: true, usesCustom: false });
  }

  const week = parsed.data as WorkWeekState;
  const valid = validateWorkWeekAgainstShop(week);
  if (!valid.ok) {
    return NextResponse.json({ message: valid.message }, { status: 400 });
  }

  await prisma.staffMember.update({
    where: { id },
    data: { workWeekJson: week },
  });

  return NextResponse.json({ ok: true, usesCustom: true });
}

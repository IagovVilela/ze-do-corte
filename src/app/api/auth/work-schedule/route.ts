import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  defaultWorkWeekFromShop,
  parseWorkWeekFromDb,
  validateWorkWeekAgainstShop,
  workSchedulePatchSchema,
  type WorkWeekState,
} from "@/lib/work-week";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  if (auth.access.role !== "STAFF") {
    return NextResponse.json(
      { message: "Apenas funcionários podem consultar este expediente." },
      { status: 403 },
    );
  }

  const member = await prisma.staffMember.findUnique({
    where: { id: auth.access.userId },
    select: { workWeekJson: true },
  });

  const defaults = defaultWorkWeekFromShop();
  const custom = parseWorkWeekFromDb(member?.workWeekJson ?? null);
  const usesCustom = custom !== null;
  const week: WorkWeekState = custom ?? defaults;

  return NextResponse.json({
    usesCustom,
    week,
    defaults,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  if (auth.access.role !== "STAFF") {
    return NextResponse.json(
      { message: "Apenas funcionários podem alterar este expediente." },
      { status: 403 },
    );
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
      where: { id: auth.access.userId },
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
    where: { id: auth.access.userId },
    data: { workWeekJson: week },
  });

  return NextResponse.json({ ok: true, usesCustom: true });
}

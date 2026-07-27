import { NextResponse } from "next/server";
import { z } from "zod";
import { endOfMonth, startOfMonth } from "date-fns";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const yearMonthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Use AAAA-MM");

function monthBounds(yearMonth: string) {
  const [y, m] = yearMonth.split("-").map(Number);
  const from = startOfMonth(new Date(y!, m! - 1, 1));
  const to = endOfMonth(from);
  return { from, to };
}

export async function GET(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.viewRevenue) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const defaultYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const ymRaw = searchParams.get("yearMonth") ?? defaultYm;
  const ymParsed = yearMonthSchema.safeParse(ymRaw);
  if (!ymParsed.success) {
    return NextResponse.json({ message: "yearMonth inválido." }, { status: 400 });
  }
  const yearMonth = ymParsed.data;
  const { from, to } = monthBounds(yearMonth);

  const staff = await prisma.staffMember.findMany({
    where: {
      organizationId: auth.access.organizationId,
      role: "STAFF",
    },
    select: {
      id: true,
      displayName: true,
      email: true,
    },
    orderBy: [{ displayName: "asc" }, { email: "asc" }],
  });

  const [goals, paidAppointments] = await Promise.all([
    prisma.staffMonthlyGoal.findMany({
      where: {
        organizationId: auth.access.organizationId,
        yearMonth,
      },
    }),
    prisma.appointment.findMany({
      where: {
        unit: { organizationId: auth.access.organizationId },
        paidAt: { gte: from, lte: to },
        status: { in: ["CONFIRMED", "COMPLETED"] },
        staffMemberId: { not: null },
      },
      select: {
        staffMemberId: true,
        amountPaid: true,
        service: { select: { price: true } },
        items: { select: { price: true } },
        products: { select: { quantity: true, unitPrice: true } },
      },
    }),
  ]);

  const revenueByStaff = new Map<string, number>();
  const visitsByStaff = new Map<string, number>();
  for (const a of paidAppointments) {
    const id = a.staffMemberId;
    if (!id) continue;
    const service =
      a.amountPaid != null
        ? Number(a.amountPaid)
        : Number(a.service.price) +
          a.items.reduce((s, i) => s + Number(i.price), 0);
    const products = a.products.reduce(
      (s, p) => s + Number(p.unitPrice) * p.quantity,
      0,
    );
    revenueByStaff.set(id, (revenueByStaff.get(id) ?? 0) + service + products);
    visitsByStaff.set(id, (visitsByStaff.get(id) ?? 0) + 1);
  }

  const goalByStaff = new Map(goals.map((g) => [g.staffMemberId, g]));

  const rows = staff.map((s) => {
    const goal = goalByStaff.get(s.id);
    const revenue = Math.round((revenueByStaff.get(s.id) ?? 0) * 100) / 100;
    const visits = visitsByStaff.get(s.id) ?? 0;
    const revenueGoal = goal ? Number(goal.revenueGoal) : null;
    const visitGoal = goal?.visitGoal ?? null;
    return {
      staffMemberId: s.id,
      professionalName: s.displayName?.trim() || s.email,
      revenueGoal,
      visitGoal,
      revenue,
      visits,
      revenueProgress:
        revenueGoal != null && revenueGoal > 0
          ? Math.round((revenue / revenueGoal) * 1000) / 10
          : null,
      visitProgress:
        visitGoal != null && visitGoal > 0
          ? Math.round((visits / visitGoal) * 1000) / 10
          : null,
    };
  });

  return NextResponse.json({ yearMonth, rows });
}

const upsertSchema = z.object({
  yearMonth: yearMonthSchema,
  staffMemberId: z.string().min(1),
  revenueGoal: z.number().finite().min(0),
  visitGoal: z.number().int().min(0).nullable().optional(),
});

export async function PUT(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.viewRevenue) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const staff = await prisma.staffMember.findFirst({
    where: {
      id: parsed.data.staffMemberId,
      organizationId: auth.access.organizationId,
      role: "STAFF",
    },
    select: { id: true },
  });
  if (!staff) {
    return NextResponse.json(
      { message: "Profissional inválido." },
      { status: 400 },
    );
  }

  const goal = await prisma.staffMonthlyGoal.upsert({
    where: {
      staffMemberId_yearMonth: {
        staffMemberId: parsed.data.staffMemberId,
        yearMonth: parsed.data.yearMonth,
      },
    },
    create: {
      organizationId: auth.access.organizationId,
      staffMemberId: parsed.data.staffMemberId,
      yearMonth: parsed.data.yearMonth,
      revenueGoal: parsed.data.revenueGoal,
      visitGoal: parsed.data.visitGoal ?? null,
    },
    update: {
      revenueGoal: parsed.data.revenueGoal,
      visitGoal:
        parsed.data.visitGoal === undefined
          ? undefined
          : parsed.data.visitGoal,
    },
  });

  return NextResponse.json({
    ok: true,
    goal: {
      id: goal.id,
      staffMemberId: goal.staffMemberId,
      yearMonth: goal.yearMonth,
      revenueGoal: Number(goal.revenueGoal),
      visitGoal: goal.visitGoal,
    },
  });
}

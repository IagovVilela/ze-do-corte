import type { StaffRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { hashPassword } from "@/lib/password";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import { staffEmailSchema } from "@/lib/staff-email";
import { canAssignRole } from "@/lib/staff-access";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  email: staffEmailSchema,
  displayName: z.string().trim().max(120).optional().nullable(),
  role: z.enum(["OWNER", "ADMIN", "STAFF"]),
  unitId: z.string().min(1).optional().nullable(),
  initialPassword: z.string().min(MIN_PASSWORD_LENGTH).max(200),
});

export async function GET() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (auth.access.permissions.manageStaff === "none") {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const staff = await prisma.staffMember.findMany({
    include: { unit: true },
    orderBy: [{ role: "asc" }, { email: "asc" }],
  });
  const safe = staff.map(({ passwordHash: _p, ...rest }) => ({
    ...rest,
    hasPassword: Boolean(_p),
  }));
  return NextResponse.json({ staff: safe });
}

export async function POST(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (auth.access.permissions.manageStaff === "none") {
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

  const role = parsed.data.role as StaffRole;
  if (!canAssignRole(auth.access, role)) {
    return NextResponse.json(
      { message: "Seu papel não permite criar este tipo de usuário." },
      { status: 403 },
    );
  }

  if (auth.access.permissions.manageStaff === "staff_only" && role !== "STAFF") {
    return NextResponse.json(
      { message: "Administradores só podem criar contas de funcionário." },
      { status: 403 },
    );
  }

  if (role === "OWNER" && auth.access.role !== "OWNER") {
    return NextResponse.json(
      { message: "Apenas o proprietário pode criar outro proprietário." },
      { status: 403 },
    );
  }

  if (role === "STAFF" && !parsed.data.unitId) {
    return NextResponse.json(
      { message: "Funcionários devem estar associados a uma unidade." },
      { status: 400 },
    );
  }

  if (role !== "STAFF" && parsed.data.unitId) {
    return NextResponse.json(
      { message: "Administradores e proprietários em registro não usam unidade única." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const passwordHash = await hashPassword(parsed.data.initialPassword);

  try {
    const member = await prisma.staffMember.create({
      data: {
        email,
        displayName: parsed.data.displayName?.trim() || null,
        role,
        unitId: parsed.data.unitId ?? null,
        passwordHash,
      },
      include: { unit: true },
    });
    const { passwordHash: _ph, ...rest } = member;
    return NextResponse.json(
      { member: { ...rest, hasPassword: Boolean(_ph) } },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { message: "E-mail já cadastrado na equipe." },
      { status: 409 },
    );
  }
}

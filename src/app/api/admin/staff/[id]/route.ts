import type { StaffRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { hashPassword } from "@/lib/password";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import { canAssignRole, canModifyStaffMember } from "@/lib/staff-access";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  displayName: z.string().trim().max(120).optional().nullable(),
  role: z.enum(["OWNER", "ADMIN", "STAFF"]).optional(),
  unitId: z.string().min(1).optional().nullable(),
  newPassword: z.string().min(MIN_PASSWORD_LENGTH).max(200).optional(),
  /** Só para `STAFF`; visível na home se `showOnWebsite`. */
  websiteBio: z.string().trim().max(400).optional().nullable(),
  showOnWebsite: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (auth.access.permissions.manageStaff === "none") {
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

  const existing = await prisma.staffMember.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ message: "Membro não encontrado." }, { status: 404 });
  }

  if (!canModifyStaffMember(auth.access, existing)) {
    return NextResponse.json({ message: "Não pode alterar este usuário." }, { status: 403 });
  }

  const touchesWebsite =
    parsed.data.websiteBio !== undefined || parsed.data.showOnWebsite !== undefined;
  if (touchesWebsite && existing.role !== "STAFF") {
    return NextResponse.json(
      {
        message:
          "Texto e visibilidade no site institucional aplicam-se apenas a funcionários (barbeiros).",
      },
      { status: 400 },
    );
  }

  if (parsed.data.role !== undefined) {
    const nextRole = parsed.data.role as StaffRole;
    if (!canAssignRole(auth.access, nextRole)) {
      return NextResponse.json({ message: "Sem permissão para este papel." }, { status: 403 });
    }
    if (auth.access.permissions.manageStaff === "staff_only" && nextRole !== "STAFF") {
      return NextResponse.json({ message: "Apenas o proprietário altera administradores." }, { status: 403 });
    }
  }

  const nextRole = (parsed.data.role ?? existing.role) as StaffRole;
  let unitId =
    parsed.data.unitId !== undefined ? parsed.data.unitId : existing.unitId;

  if (nextRole === "STAFF" && !unitId) {
    return NextResponse.json(
      { message: "Funcionários precisam de unidade." },
      { status: 400 },
    );
  }
  if (nextRole !== "STAFF") {
    unitId = null;
  }

  let nextPasswordHash: string | undefined;
  if (parsed.data.newPassword) {
    nextPasswordHash = await hashPassword(parsed.data.newPassword);
    await prisma.session.deleteMany({ where: { staffMemberId: id } });
  }

  const updateData: {
    displayName?: string | null;
    role?: StaffRole;
    unitId: string | null;
    passwordHash?: string;
    websiteBio?: string | null;
    showOnWebsite?: boolean;
  } = {
    ...(parsed.data.displayName !== undefined
      ? { displayName: parsed.data.displayName?.trim() || null }
      : {}),
    ...(parsed.data.role !== undefined ? { role: parsed.data.role as StaffRole } : {}),
    unitId,
    ...(nextPasswordHash !== undefined ? { passwordHash: nextPasswordHash } : {}),
  };

  if (nextRole !== "STAFF") {
    updateData.websiteBio = null;
    updateData.showOnWebsite = false;
  } else if (touchesWebsite) {
    if (parsed.data.websiteBio !== undefined) {
      updateData.websiteBio = parsed.data.websiteBio?.trim() || null;
    }
    if (parsed.data.showOnWebsite !== undefined) {
      updateData.showOnWebsite = parsed.data.showOnWebsite;
    }
  }

  const member = await prisma.staffMember.update({
    where: { id },
    data: updateData,
    include: { unit: true },
  });

  const { passwordHash: _ph, ...rest } = member;
  return NextResponse.json({
    member: { ...rest, hasPassword: Boolean(_ph) },
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (auth.access.permissions.manageStaff === "none") {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const { id } = await context.params;

  const existing = await prisma.staffMember.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ message: "Membro não encontrado." }, { status: 404 });
  }

  if (!canModifyStaffMember(auth.access, existing)) {
    return NextResponse.json({ message: "Não pode remover este usuário." }, { status: 403 });
  }

  await prisma.staffMember.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { clearSessionCookie, requireStaffApiAuth } from "@/lib/admin-auth";
import { normalizeBrProfilePhone } from "@/lib/br-phone-format";
import { hashPassword, verifyPassword } from "@/lib/password";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const patchSchema = z
  .object({
    email: z.string().trim().email("E-mail inválido.").optional(),
    displayName: z.string().trim().max(120).optional().nullable(),
    phone: z.string().trim().max(24).optional().nullable(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(MIN_PASSWORD_LENGTH).max(200).optional(),
  })
  .refine(
    (d) => {
      if (d.newPassword && !(d.currentPassword && d.currentPassword.length > 0)) {
        return false;
      }
      return true;
    },
    { message: "Informe a senha atual para alterar a senha.", path: ["currentPassword"] },
  );

export async function PATCH(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

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

  const hasProfileFields =
    parsed.data.email !== undefined || parsed.data.displayName !== undefined || parsed.data.phone !== undefined;
  const hasPasswordChange = Boolean(parsed.data.newPassword);

  if (!hasProfileFields && !hasPasswordChange) {
    return NextResponse.json({ message: "Nada para atualizar." }, { status: 400 });
  }

  const member = await prisma.staffMember.findUnique({
    where: { id: auth.access.userId },
    select: { id: true, email: true, passwordHash: true },
  });
  if (!member) {
    return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
  }

  if (parsed.data.email && parsed.data.email !== member.email) {
    const existing = await prisma.staffMember.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ message: "Este e-mail já está em uso." }, { status: 400 });
    }
  }

  if (hasPasswordChange) {
    const plain = parsed.data.currentPassword ?? "";
    if (!member.passwordHash || !(await verifyPassword(plain, member.passwordHash))) {
      return NextResponse.json({ message: "Senha atual incorreta." }, { status: 400 });
    }
  }

  let nextPasswordHash: string | undefined;
  if (parsed.data.newPassword) {
    nextPasswordHash = await hashPassword(parsed.data.newPassword);
    await prisma.session.deleteMany({ where: { staffMemberId: member.id } });
  }

  const updated = await prisma.staffMember.update({
    where: { id: member.id },
    data: {
      ...(parsed.data.email !== undefined ? { email: parsed.data.email } : {}),
      ...(parsed.data.displayName !== undefined
        ? { displayName: parsed.data.displayName?.trim() || null }
        : {}),
      ...(parsed.data.phone !== undefined
        ? { phone: normalizeBrProfilePhone(parsed.data.phone) }
        : {}),
      ...(nextPasswordHash !== undefined ? { passwordHash: nextPasswordHash } : {}),
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      phone: true,
      profileImageUrl: true,
      role: true,
    },
  });

  const res = NextResponse.json({
    profile: updated,
    /** Quando a senha mudou, o cookie atual foi invalidado — o cliente deve ir ao login. */
    sessionEnded: Boolean(nextPasswordHash),
  });
  if (nextPasswordHash) {
    clearSessionCookie(res);
  }
  return res;
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePlatformApiAuth } from "@/lib/platform-auth";
import { hashPassword } from "@/lib/password";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import { findConsultantById } from "@/lib/support-consultant";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  displayName: z.string().trim().min(2).max(120).optional(),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(200).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requirePlatformApiAuth();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
  }

  const existing = await findConsultantById(id);
  if (!existing) {
    return NextResponse.json({ message: "Consultor não encontrado." }, { status: 404 });
  }

  const consultant = await prisma.staffMember.update({
    where: { id },
    data: {
      ...(parsed.data.isActive !== undefined
        ? { isActive: parsed.data.isActive }
        : {}),
      ...(parsed.data.displayName !== undefined
        ? { displayName: parsed.data.displayName }
        : {}),
      ...(parsed.data.password
        ? { passwordHash: await hashPassword(parsed.data.password) }
        : {}),
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      isActive: true,
    },
  });

  return NextResponse.json({ consultant });
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { appendSessionCookie } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createDbSession } from "@/lib/session-cookie";
import { staffEmailSchema } from "@/lib/staff-email";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: staffEmailSchema,
  password: z.string().min(1),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const member = await prisma.staffMember.findUnique({ where: { email } });
  if (!member?.passwordHash) {
    return NextResponse.json(
      { message: "E-mail ou senha incorretos." },
      { status: 401 },
    );
  }

  const ok = await verifyPassword(parsed.data.password, member.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { message: "E-mail ou senha incorretos." },
      { status: 401 },
    );
  }

  if (member.role === "STAFF" && !member.unitId) {
    return NextResponse.json(
      { message: "Conta incompleta: funcionário sem unidade. Fale com o administrador." },
      { status: 403 },
    );
  }

  const raw = await createDbSession(member.id);
  const res = NextResponse.json({ ok: true, redirect: "/admin" });
  appendSessionCookie(res, raw);
  return res;
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  appendSessionCookie,
  clearSessionCookie,
} from "@/lib/admin-auth";
import {
  isPlatformAdminEmail,
  PLATFORM_OPS_IMPERSONATOR_COOKIE,
} from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";
import {
  createDbSession,
  deleteSessionByRawToken,
  SESSION_COOKIE_NAME,
} from "@/lib/session-cookie";

export const dynamic = "force-dynamic";

/** Restaura a sessão do Ops após “entrar como dono”. */
export async function POST() {
  const jar = await cookies();
  const opsStaffId = jar.get(PLATFORM_OPS_IMPERSONATOR_COOKIE)?.value?.trim();
  if (!opsStaffId) {
    return NextResponse.json(
      { message: "Nenhuma sessão Ops para restaurar." },
      { status: 400 },
    );
  }

  const opsMember = await prisma.staffMember.findUnique({
    where: { id: opsStaffId },
    select: { id: true, email: true },
  });

  if (!opsMember || !isPlatformAdminEmail(opsMember.email)) {
    const res = NextResponse.json(
      { message: "Conta Ops inválida. Faça login de novo no console." },
      { status: 403 },
    );
    res.cookies.set(PLATFORM_OPS_IMPERSONATOR_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return res;
  }

  const currentRaw = jar.get(SESSION_COOKIE_NAME)?.value;
  await deleteSessionByRawToken(currentRaw);

  const raw = await createDbSession(opsMember.id);
  const res = NextResponse.json({
    ok: true,
    redirect: "/plataforma/barbearias",
  });
  clearSessionCookie(res);
  appendSessionCookie(res, raw);
  res.cookies.set(PLATFORM_OPS_IMPERSONATOR_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

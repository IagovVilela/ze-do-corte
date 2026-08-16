import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  appendSessionCookie,
  clearSessionCookie,
} from "@/lib/admin-auth";
import { SUPPORT_ASSIST_RETURN_COOKIE } from "@/lib/consultant-auth";
import { prisma } from "@/lib/prisma";
import {
  createDbSession,
  deleteSessionByRawToken,
  SESSION_COOKIE_NAME,
} from "@/lib/session-cookie";

export const dynamic = "force-dynamic";

export async function POST() {
  const jar = await cookies();
  const consultantId = jar.get(SUPPORT_ASSIST_RETURN_COOKIE)?.value?.trim();
  if (!consultantId) {
    return NextResponse.json(
      { message: "Nenhuma sessão de consultor para restaurar." },
      { status: 400 },
    );
  }

  const member = await prisma.staffMember.findUnique({
    where: { id: consultantId },
    select: { id: true, role: true, isActive: true },
  });

  if (
    !member ||
    member.role !== "SUPPORT_CONSULTANT" ||
    member.isActive === false
  ) {
    const res = NextResponse.json(
      { message: "Conta de consultor inválida. Entre de novo no console." },
      { status: 403 },
    );
    res.cookies.set(SUPPORT_ASSIST_RETURN_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return res;
  }

  await deleteSessionByRawToken(jar.get(SESSION_COOKIE_NAME)?.value);
  const raw = await createDbSession(member.id);
  const res = NextResponse.json({ ok: true, redirect: "/consultores" });
  clearSessionCookie(res);
  appendSessionCookie(res, raw);
  res.cookies.set(SUPPORT_ASSIST_RETURN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

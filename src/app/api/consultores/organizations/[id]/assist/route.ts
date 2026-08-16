import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  appendSessionCookie,
  clearSessionCookie,
} from "@/lib/admin-auth";
import {
  requireConsultantApiAuth,
  SUPPORT_ASSIST_RETURN_COOKIE,
} from "@/lib/consultant-auth";
import { prisma } from "@/lib/prisma";
import {
  createDbSession,
  deleteSessionByRawToken,
  SESSION_COOKIE_NAME,
} from "@/lib/session-cookie";
import {
  assistStaffEmail,
  logSupportAccess,
  SUPPORT_CONSULTANT_ORG_SLUG,
} from "@/lib/support-consultant";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const auth = await requireConsultantApiAuth();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const org = await prisma.organization.findFirst({
    where: { id, slug: { not: SUPPORT_CONSULTANT_ORG_SLUG } },
    select: { id: true, name: true },
  });
  if (!org) {
    return NextResponse.json({ message: "Barbearia não encontrada." }, { status: 404 });
  }

  const email = assistStaffEmail(org.id);
  const assist = await prisma.staffMember.upsert({
    where: { email },
    create: {
      organizationId: org.id,
      email,
      displayName: "Assistência Barbernegon",
      role: "SUPPORT_ASSIST",
      isActive: true,
      showOnWebsite: false,
    },
    update: {
      role: "SUPPORT_ASSIST",
      isActive: true,
      showOnWebsite: false,
      organizationId: org.id,
    },
    select: { id: true },
  });

  const jar = await cookies();
  await deleteSessionByRawToken(jar.get(SESSION_COOKIE_NAME)?.value);

  const raw = await createDbSession(assist.id);
  await logSupportAccess({
    consultantStaffId: auth.access.userId,
    organizationId: org.id,
    action: "ASSIST_LOGIN",
  });

  const secure = process.env.NODE_ENV === "production";
  const res = NextResponse.json({
    ok: true,
    redirect: "/admin",
    organizationId: org.id,
  });
  clearSessionCookie(res);
  appendSessionCookie(res, raw);
  res.cookies.set(SUPPORT_ASSIST_RETURN_COOKIE, auth.access.userId, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4,
  });
  return res;
}

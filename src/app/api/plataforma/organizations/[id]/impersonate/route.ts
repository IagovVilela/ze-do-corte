import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  appendSessionCookie,
  clearSessionCookie,
} from "@/lib/admin-auth";
import {
  PLATFORM_OPS_IMPERSONATOR_COOKIE,
  requirePlatformApiAuth,
} from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";
import {
  createDbSession,
  deleteSessionByRawToken,
  SESSION_COOKIE_NAME,
} from "@/lib/session-cookie";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Ops entra no painel do salão como OWNER (sessão temporária).
 * Cookie `bn_ops_impersonator` guarda o staff do Ops para “Voltar”.
 */
export async function POST(_request: Request, context: RouteContext) {
  const auth = await requirePlatformApiAuth();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const owner = await prisma.staffMember.findFirst({
    where: { organizationId: id, role: "OWNER" },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, organizationId: true },
  });

  if (!owner) {
    return NextResponse.json(
      { message: "Esta barbearia não tem OWNER para impersonar." },
      { status: 400 },
    );
  }

  if (owner.id === auth.access.userId) {
    return NextResponse.json({
      ok: true,
      redirect: "/admin",
      message: "Você já é o OWNER desta organização.",
    });
  }

  const jar = await cookies();
  await deleteSessionByRawToken(jar.get(SESSION_COOKIE_NAME)?.value);

  const raw = await createDbSession(owner.id);
  const res = NextResponse.json({
    ok: true,
    redirect: "/admin",
    organizationId: id,
    asEmail: owner.email,
  });

  const secure = process.env.NODE_ENV === "production";
  clearSessionCookie(res);
  appendSessionCookie(res, raw);
  res.cookies.set(PLATFORM_OPS_IMPERSONATOR_COOKIE, auth.access.userId, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4,
  });

  return res;
}

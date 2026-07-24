import { NextResponse } from "next/server";
import { z } from "zod";

import { appendSessionCookie } from "@/lib/admin-auth";
import {
  isPlatformAdminEmail,
  isValidPlatformOpsGate,
  PLATFORM_OPS_GATE_COOKIE,
} from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";
import {
  DUMMY_PASSWORD_HASH,
  verifyPassword,
} from "@/lib/password";
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { createDbSession } from "@/lib/session-cookie";
import { staffEmailSchema } from "@/lib/staff-email";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: staffEmailSchema,
  password: z.string().min(1),
  /** Legado — preferir cookie httpOnly `bn_ops_gate`. */
  gate: z.string().min(1).optional(),
});

function gateFromRequest(request: Request, bodyGate?: string): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${PLATFORM_OPS_GATE_COOKIE}=`));
  if (match) {
    const v = decodeURIComponent(match.slice(PLATFORM_OPS_GATE_COOKIE.length + 1));
    if (v) return v;
  }
  return bodyGate?.trim() || null;
}

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

  const ip = clientIpFromRequest(request);
  const byIp = checkRateLimit(`ops-login:ip:${ip}`, {
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (!byIp.ok) {
    return NextResponse.json(rateLimitResponse(byIp.retryAfterSec), {
      status: 429,
      headers: { "Retry-After": String(byIp.retryAfterSec) },
    });
  }

  const gate = gateFromRequest(request, parsed.data.gate);
  if (!isValidPlatformOpsGate(gate)) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 404 });
  }

  const email = parsed.data.email.toLowerCase();
  const byEmail = checkRateLimit(`ops-login:email:${email}`, {
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!byEmail.ok) {
    return NextResponse.json(rateLimitResponse(byEmail.retryAfterSec), {
      status: 429,
      headers: { "Retry-After": String(byEmail.retryAfterSec) },
    });
  }

  if (!isPlatformAdminEmail(email)) {
    await verifyPassword(parsed.data.password, DUMMY_PASSWORD_HASH);
    return NextResponse.json(
      { message: "E-mail ou senha incorretos." },
      { status: 401 },
    );
  }

  const member = await prisma.staffMember.findUnique({ where: { email } });
  const hash = member?.passwordHash || DUMMY_PASSWORD_HASH;
  const ok = await verifyPassword(parsed.data.password, hash);
  if (!member?.passwordHash || !ok) {
    return NextResponse.json(
      { message: "E-mail ou senha incorretos." },
      { status: 401 },
    );
  }

  const raw = await createDbSession(member.id);
  const res = NextResponse.json({ ok: true, redirect: "/plataforma" });
  appendSessionCookie(res, raw);
  return res;
}

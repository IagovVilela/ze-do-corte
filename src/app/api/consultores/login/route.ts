import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { appendSessionCookie } from "@/lib/admin-auth";
import {
  appendSupportConsultantGateCookie,
  isValidSupportConsultantGate,
  SUPPORT_CONSULTANT_GATE_COOKIE,
} from "@/lib/consultant-auth";
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
import { findStaffAuthByEmail } from "@/lib/staff-auth-lookup";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: staffEmailSchema,
  password: z.string().min(1),
  gate: z.string().min(1).optional(),
});

async function gateFromRequest(bodyGate?: string): Promise<string | null> {
  if (bodyGate?.trim()) return bodyGate.trim();
  const jar = await cookies();
  for (const c of jar.getAll(SUPPORT_CONSULTANT_GATE_COOKIE)) {
    if (c.value?.trim()) return c.value.trim();
  }
  return null;
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
  const byIp = checkRateLimit(`consultor-login:ip:${ip}`, {
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (!byIp.ok) {
    return NextResponse.json(rateLimitResponse(byIp.retryAfterSec), {
      status: 429,
      headers: { "Retry-After": String(byIp.retryAfterSec) },
    });
  }

  const gate = await gateFromRequest(parsed.data.gate);
  if (!isValidSupportConsultantGate(gate)) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 404 });
  }

  const email = parsed.data.email.toLowerCase();
  const byEmail = checkRateLimit(`consultor-login:email:${email}`, {
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!byEmail.ok) {
    return NextResponse.json(rateLimitResponse(byEmail.retryAfterSec), {
      status: 429,
      headers: { "Retry-After": String(byEmail.retryAfterSec) },
    });
  }

  const member = await findStaffAuthByEmail(email);
  const hash = member?.passwordHash || DUMMY_PASSWORD_HASH;
  const ok = await verifyPassword(parsed.data.password, hash);
  if (
    !member?.passwordHash ||
    !ok ||
    member.role !== "SUPPORT_CONSULTANT" ||
    member.isActive === false
  ) {
    return NextResponse.json(
      { message: "E-mail ou senha incorretos." },
      { status: 401 },
    );
  }

  const raw = await createDbSession(member.id);
  const res = NextResponse.json({ ok: true, redirect: "/consultores" });
  appendSessionCookie(res, raw);
  appendSupportConsultantGateCookie(res, gate!);
  return res;
}

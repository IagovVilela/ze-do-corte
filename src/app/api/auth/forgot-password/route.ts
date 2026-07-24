import { NextResponse } from "next/server";
import { z } from "zod";

import {
  DUMMY_PASSWORD_HASH,
  verifyPassword,
} from "@/lib/password";
import {
  issuePasswordResetToken,
  resolvePasswordResetAppBaseUrl,
  sendPasswordResetEmail,
} from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { staffEmailSchema } from "@/lib/staff-email";

export const dynamic = "force-dynamic";

const GENERIC_OK_MESSAGE =
  "Se existir uma conta com este e-mail, enviamos um link para redefinir a senha. Confira a caixa de entrada e o spam.";

const bodySchema = z.object({
  email: staffEmailSchema,
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
  const ip = clientIpFromRequest(request);
  const byIp = checkRateLimit(`auth-forgot:ip:${ip}`, {
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  const byEmail = checkRateLimit(`auth-forgot:email:${email}`, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!byIp.ok || !byEmail.ok) {
    const retry = Math.max(
      byIp.ok ? 0 : byIp.retryAfterSec,
      byEmail.ok ? 0 : byEmail.retryAfterSec,
    );
    return NextResponse.json(rateLimitResponse(retry), {
      status: 429,
      headers: { "Retry-After": String(retry) },
    });
  }

  const member = await prisma.staffMember.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      displayName: true,
      passwordHash: true,
    },
  });

  // Equaliza tempo quando o e-mail não existe (anti-enumeração por timing).
  if (!member?.passwordHash) {
    await verifyPassword("password-reset-probe", DUMMY_PASSWORD_HASH);
    return NextResponse.json({ ok: true, message: GENERIC_OK_MESSAGE });
  }

  try {
    const { rawToken, expiresAt } = await issuePasswordResetToken(member.id);
    const base = resolvePasswordResetAppBaseUrl(request);
    const resetUrl = `${base}/admin/redefinir-senha?token=${encodeURIComponent(rawToken)}`;

    await sendPasswordResetEmail({
      to: member.email,
      displayName: member.displayName,
      resetUrl,
      expiresAt,
    });
  } catch (error) {
    console.error("[forgot-password] falha ao emitir/enviar reset:", error);
    const detail =
      process.env.NODE_ENV !== "production" && error instanceof Error
        ? error.message
        : undefined;
    return NextResponse.json(
      {
        message:
          "Não foi possível processar o pedido agora. Tente de novo em instantes.",
        ...(detail ? { detail } : {}),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, message: GENERIC_OK_MESSAGE });
}

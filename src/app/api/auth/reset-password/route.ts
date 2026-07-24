import { NextResponse } from "next/server";
import { z } from "zod";

import { hashPassword } from "@/lib/password";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";
import {
  consumePasswordResetToken,
  findValidPasswordResetToken,
  hashPasswordResetToken,
} from "@/lib/password-reset";
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitResponse,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    token: z.string().trim().min(20).max(200),
    password: z
      .string()
      .min(
        MIN_PASSWORD_LENGTH,
        `Senha com pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      )
      .max(200),
    confirmPassword: z.string().min(1).max(200),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
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

  const ip = clientIpFromRequest(request);
  const byIp = checkRateLimit(`auth-reset:ip:${ip}`, {
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (!byIp.ok) {
    return NextResponse.json(rateLimitResponse(byIp.retryAfterSec), {
      status: 429,
      headers: { "Retry-After": String(byIp.retryAfterSec) },
    });
  }

  const tokenHash = hashPasswordResetToken(parsed.data.token);
  let row: Awaited<ReturnType<typeof findValidPasswordResetToken>>;
  try {
    row = await findValidPasswordResetToken(tokenHash);
  } catch (error) {
    console.error("[reset-password] falha ao buscar token:", error);
    return NextResponse.json(
      {
        message:
          "Não foi possível validar o link agora. Tente de novo em instantes.",
      },
      { status: 500 },
    );
  }

  if (!row || row.usedAt || new Date(row.expiresAt).getTime() <= Date.now()) {
    return NextResponse.json(
      {
        message:
          "Este link expirou ou já foi usado. Peça um novo em “Esqueci minha senha”.",
      },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);

  try {
    await consumePasswordResetToken({
      tokenId: row.id,
      staffMemberId: row.staffMemberId,
      passwordHash,
    });
  } catch (error) {
    console.error("[reset-password] falha ao atualizar senha:", error);
    return NextResponse.json(
      {
        message:
          "Não foi possível salvar a nova senha agora. Tente de novo em instantes.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Senha atualizada. Você já pode entrar com a nova senha.",
  });
}

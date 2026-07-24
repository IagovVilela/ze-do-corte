import "server-only";

import { createHash, randomBytes } from "crypto";
import { Resend } from "resend";

import { prisma } from "@/lib/prisma";
import { getPublicAppBaseUrl } from "@/lib/public-app-url";

/** Validade do link (padrão de produtos como Google/GitHub: ~1h). */
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export function hashPasswordResetToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function createRawPasswordResetToken(): string {
  return randomBytes(32).toString("hex");
}

/** Base URL para o link do e-mail (env pública ou headers da requisição). */
export function resolvePasswordResetAppBaseUrl(request: Request): string {
  const configured = getPublicAppBaseUrl();
  if (configured) return configured;

  const protoHeader = request.headers.get("x-forwarded-proto");
  const hostHeader =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = (protoHeader?.split(",")[0] ?? "http").trim();
  const host = (hostHeader?.split(",")[0] ?? "").trim();
  if (host) return `${proto}://${host}`;

  return "http://localhost:3000";
}

/**
 * Invalida tokens anteriores e cria um novo.
 * Usa SQL (não o delegate `passwordResetToken`) para não quebrar com
 * Prisma Client em cache de hot-reload após `prisma generate`.
 */
export async function issuePasswordResetToken(
  staffMemberId: string,
): Promise<{ rawToken: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  const rawToken = createRawPasswordResetToken();
  const tokenHash = hashPasswordResetToken(rawToken);
  const id = `prt_${randomBytes(12).toString("hex")}`;

  await prisma.$executeRaw`
    DELETE FROM "PasswordResetToken"
    WHERE "staffMemberId" = ${staffMemberId} AND "usedAt" IS NULL
  `;

  await prisma.$executeRaw`
    INSERT INTO "PasswordResetToken" ("id", "staffMemberId", "tokenHash", "expiresAt", "createdAt")
    VALUES (${id}, ${staffMemberId}, ${tokenHash}, ${expiresAt}, NOW())
  `;

  return { rawToken, expiresAt };
}

export type PasswordResetTokenRow = {
  id: string;
  staffMemberId: string;
  expiresAt: Date;
  usedAt: Date | null;
};

export async function findValidPasswordResetToken(
  tokenHash: string,
): Promise<PasswordResetTokenRow | null> {
  const rows = await prisma.$queryRaw<PasswordResetTokenRow[]>`
    SELECT "id", "staffMemberId", "expiresAt", "usedAt"
    FROM "PasswordResetToken"
    WHERE "tokenHash" = ${tokenHash}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function consumePasswordResetToken(options: {
  tokenId: string;
  staffMemberId: string;
  passwordHash: string;
}): Promise<void> {
  const now = new Date();

  await prisma.$executeRaw`
    UPDATE "StaffMember"
    SET "passwordHash" = ${options.passwordHash}, "updatedAt" = ${now}
    WHERE "id" = ${options.staffMemberId}
  `;

  await prisma.$executeRaw`
    UPDATE "PasswordResetToken"
    SET "usedAt" = ${now}
    WHERE "id" = ${options.tokenId}
  `;

  await prisma.$executeRaw`
    DELETE FROM "PasswordResetToken"
    WHERE "staffMemberId" = ${options.staffMemberId}
      AND "usedAt" IS NULL
      AND "id" <> ${options.tokenId}
  `;

  await prisma.$executeRaw`
    DELETE FROM "Session"
    WHERE "staffMemberId" = ${options.staffMemberId}
  `;
}

export async function sendPasswordResetEmail(options: {
  to: string;
  displayName: string | null;
  resetUrl: string;
  expiresAt: Date;
}): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const name = options.displayName?.trim() || "olá";
  const expiresLabel = options.expiresAt.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  const subject = "Redefinir senha — Barbernegon";
  const text = [
    `Oi, ${name}!`,
    "",
    "Recebemos um pedido para redefinir a senha do painel Barbernegon.",
    "",
    `Abra este link (válido até ${expiresLabel}):`,
    options.resetUrl,
    "",
    "Se você não pediu isso, ignore este e-mail — a senha continua a mesma.",
    "",
    "— Equipe Barbernegon",
  ].join("\n");

  const html = `
    <p>Oi, ${escapeHtml(name)}!</p>
    <p>Recebemos um pedido para redefinir a senha do painel <strong>Barbernegon</strong>.</p>
    <p><a href="${escapeHtml(options.resetUrl)}">Redefinir minha senha</a></p>
    <p style="color:#666;font-size:14px">O link vale até ${escapeHtml(expiresLabel)}. Se você não pediu isso, ignore este e-mail.</p>
  `.trim();

  if (!apiKey || !from) {
    console.warn(
      "[password-reset] RESEND_API_KEY ou RESEND_FROM_EMAIL ausente — e-mail não enviado.",
      { to: options.to, resetUrl: options.resetUrl },
    );
    return { sent: false };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: options.to,
      subject,
      text,
      html,
    });

    if (error) {
      console.error("[password-reset] falha ao enviar e-mail:", error);
      return { sent: false };
    }

    return { sent: true };
  } catch (error) {
    console.error("[password-reset] exceção ao enviar e-mail:", error);
    return { sent: false };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

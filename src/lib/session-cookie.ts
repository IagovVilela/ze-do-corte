import { createHash, randomBytes } from "crypto";

import type { StaffMember } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "zdc_session";

const SESSION_DAYS = 7;

export function hashSessionToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function createRawSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function sessionCookieMaxAgeSec(): number {
  return SESSION_DAYS * 24 * 60 * 60;
}

export async function createDbSession(staffMemberId: string): Promise<string> {
  const raw = createRawSessionToken();
  const tokenHash = hashSessionToken(raw);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { tokenHash, staffMemberId, expiresAt },
  });
  return raw;
}

export async function deleteSessionByRawToken(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  const tokenHash = hashSessionToken(rawToken);
  await prisma.session.deleteMany({ where: { tokenHash } });
}

export async function findStaffMemberBySessionToken(
  rawToken: string | undefined,
): Promise<StaffMember | null> {
  if (!rawToken) return null;
  const tokenHash = hashSessionToken(rawToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { staffMember: true },
  });
  if (!session || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }
  return session.staffMember;
}

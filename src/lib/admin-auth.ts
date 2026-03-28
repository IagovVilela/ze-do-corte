import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  SESSION_COOKIE_NAME,
  findStaffMemberBySessionToken,
  sessionCookieMaxAgeSec,
} from "@/lib/session-cookie";
import { staffAccessFromMember, type StaffAccess } from "@/lib/staff-access";

async function loadStaffAccessOrNull(): Promise<StaffAccess | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE_NAME)?.value;
  const member = await findStaffMemberBySessionToken(raw);
  if (!member) return null;
  return staffAccessFromMember(member);
}

/** Uma leitura por requisição (layout + páginas admin no mesmo render). */
export const getStaffAccessOrNull = cache(loadStaffAccessOrNull);

/**
 * @deprecated Use `getStaffAccessOrNull` e `access.role`.
 */
export async function isAdminUser(_email: string | undefined | null): Promise<boolean> {
  const access = await getStaffAccessOrNull();
  return access !== null;
}

export type AdminApiAuthResult =
  | { ok: true; access: StaffAccess }
  | { ok: false; response: NextResponse };

export async function requireStaffApiAuth(): Promise<AdminApiAuthResult> {
  const access = await getStaffAccessOrNull();
  if (!access) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Não autorizado." }, { status: 401 }),
    };
  }
  return { ok: true, access };
}

/** Alias: qualquer papel com acesso ao painel. */
export async function requireAdminApiAuth(): Promise<AdminApiAuthResult> {
  return requireStaffApiAuth();
}

/** Define o cookie de sessão na resposta (rotas Route Handler). */
export function appendSessionCookie(response: NextResponse, rawToken: string): void {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: sessionCookieMaxAgeSec(),
  });
}

/** Remove o cookie de sessão. */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

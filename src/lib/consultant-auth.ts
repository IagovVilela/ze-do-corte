import "server-only";

import { NextResponse } from "next/server";
import { notFound, redirect } from "next/navigation";

import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { timingSafeEqualString } from "@/lib/rate-limit";
import type { StaffAccess } from "@/lib/staff-access";
import { extractOpsGateFromSearchParams } from "@/lib/platform-auth";

export const SUPPORT_CONSULTANT_GATE_COOKIE = "bn_support_gate";
export const SUPPORT_ASSIST_RETURN_COOKIE = "bn_support_assist";

export const SUPPORT_CONSULTANT_GATE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 12,
};

export function appendSupportConsultantGateCookie(
  res: NextResponse,
  gate: string,
): void {
  res.cookies.set(
    SUPPORT_CONSULTANT_GATE_COOKIE,
    gate,
    SUPPORT_CONSULTANT_GATE_COOKIE_OPTIONS,
  );
}

export function getSupportConsultantGate(): string | null {
  const g = process.env.SUPPORT_CONSULTANT_GATE?.trim();
  return g || null;
}

export function isValidSupportConsultantGate(
  candidate: string | null | undefined,
): boolean {
  const expected = getSupportConsultantGate();
  if (!expected || !candidate) return false;
  return timingSafeEqualString(candidate, expected);
}

export function extractSupportGateFromSearchParams(
  sp: Record<string, string | string[] | undefined> | URLSearchParams,
): string | null {
  return extractOpsGateFromSearchParams(sp);
}

export type ConsultantAccess = StaffAccess & { email: string };

export async function getConsultantAccessOrNull(): Promise<ConsultantAccess | null> {
  const access = await getStaffAccessOrNull();
  if (!access?.email) return null;
  if (access.role !== "SUPPORT_CONSULTANT") return null;
  if (!access.isActive) return null;
  return { ...access, email: access.email };
}

export async function requireConsultantPageAccess(): Promise<ConsultantAccess> {
  const access = await getConsultantAccessOrNull();
  if (!access) notFound();
  return access;
}

export type ConsultantApiAuthResult =
  | { ok: true; access: ConsultantAccess }
  | { ok: false; response: NextResponse };

export async function requireConsultantApiAuth(): Promise<ConsultantApiAuthResult> {
  const access = await getConsultantAccessOrNull();
  if (!access) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Não autorizado." },
        { status: 401 },
      ),
    };
  }
  return { ok: true, access };
}

export function redirectIfConsultantSession(
  access: ConsultantAccess | null,
): void {
  if (access) redirect("/consultores");
}

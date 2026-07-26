import "server-only";

import { NextResponse } from "next/server";
import { notFound, redirect } from "next/navigation";

import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { timingSafeEqualString } from "@/lib/rate-limit";
import type { StaffAccess } from "@/lib/staff-access";

export const PLATFORM_OPS_GATE_COOKIE = "bn_ops_gate";

/** Enquanto Ops “entra como dono”, guarda o staffMemberId do Ops para voltar. */
export const PLATFORM_OPS_IMPERSONATOR_COOKIE = "bn_ops_impersonator";

/** Path `/` — precisa cobrir `/plataforma` e `/api/plataforma/*`. */
export const PLATFORM_OPS_GATE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 8,
};

/** Grava o gate na resposta (só Route Handler / Server Action). */
export function appendPlatformOpsGateCookie(
  res: NextResponse,
  gate: string,
): void {
  // Só grava path=/ — não misturar clear de path legado no mesmo response
  // (Next pode colapsar Set-Cookie do mesmo nome e o login quebrava).
  res.cookies.set(
    PLATFORM_OPS_GATE_COOKIE,
    gate,
    PLATFORM_OPS_GATE_COOKIE_OPTIONS,
  );
}

function parseEmailList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

/** E-mails com acesso ao console `/plataforma` (cross-tenant). */
export function getPlatformAdminEmails(): Set<string> {
  const fromEnv = parseEmailList(process.env.PLATFORM_ADMIN_EMAILS);
  const seed = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase();
  const set = new Set(fromEnv);
  if (seed?.includes("@")) set.add(seed);
  return set;
}

export function isPlatformAdminEmail(email: string | undefined | null): boolean {
  if (!email?.trim()) return false;
  return getPlatformAdminEmails().has(email.trim().toLowerCase());
}

/** Chave secreta da entrada Ops. Preferir cookie httpOnly após o primeiro acesso. */
export function getPlatformOpsGate(): string | null {
  const g = process.env.PLATFORM_OPS_GATE?.trim();
  return g || null;
}

export function isValidPlatformOpsGate(
  candidate: string | null | undefined,
): boolean {
  const expected = getPlatformOpsGate();
  if (!expected || !candidate) return false;
  return timingSafeEqualString(candidate, expected);
}

/**
 * Lê o gate da query (`?k=…`).
 * Aceita encoding errado comum: `?k%3Dsegredo` (chave literal `k=segredo`).
 */
export function extractOpsGateFromSearchParams(
  sp: Record<string, string | string[] | undefined> | URLSearchParams,
): string | null {
  if (sp instanceof URLSearchParams) {
    const fromK = sp.get("k")?.trim();
    if (fromK) return fromK.replace(/[\[\]<>]+$/g, "").replace(/=+$/g, "");
    for (const key of sp.keys()) {
      if (!key.startsWith("k=")) continue;
      const v = key.slice(2).trim().replace(/[\[\]<>]+$/g, "").replace(/=+$/g, "");
      if (v) return v;
    }
    return null;
  }

  const raw = sp.k;
  const fromK = Array.isArray(raw) ? raw[0] : raw;
  if (fromK?.trim()) {
    return fromK.trim().replace(/[\[\]<>]+$/g, "").replace(/=+$/g, "");
  }

  for (const key of Object.keys(sp)) {
    if (!key.startsWith("k=")) continue;
    const v = key.slice(2).trim().replace(/[\[\]<>]+$/g, "").replace(/=+$/g, "");
    if (v) return v;
  }
  return null;
}

/**
 * URL de entrada inicial (ainda com `?k=` para o primeiro clique).
 * O formulário abre com `k` válido; o cookie é gravado no login bem-sucedido.
 */
export function platformLoginHref(gate?: string | null): string | null {
  const k = gate ?? getPlatformOpsGate();
  if (!k) return null;
  return `/plataforma/login?k=${encodeURIComponent(k)}`;
}

export type PlatformAccess = StaffAccess & { email: string };

export async function getPlatformAccessOrNull(): Promise<PlatformAccess | null> {
  const access = await getStaffAccessOrNull();
  if (!access?.email) return null;
  if (!isPlatformAdminEmail(access.email)) return null;
  return { ...access, email: access.email };
}

/**
 * Gate de páginas Ops.
 * Sem sessão: 404 (não revela URL de login).
 * Sessão sem e-mail allowlist: 404.
 */
export async function requirePlatformPageAccess(): Promise<PlatformAccess> {
  const staff = await getStaffAccessOrNull();
  if (!staff?.email || !isPlatformAdminEmail(staff.email)) {
    notFound();
  }
  return { ...staff, email: staff.email };
}

export type PlatformApiAuthResult =
  | { ok: true; access: PlatformAccess }
  | { ok: false; response: NextResponse };

export async function requirePlatformApiAuth(): Promise<PlatformApiAuthResult> {
  const staff = await getStaffAccessOrNull();
  if (!staff) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Não autorizado." }, { status: 401 }),
    };
  }
  if (!staff.email || !isPlatformAdminEmail(staff.email)) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Sem permissão para a plataforma." },
        { status: 403 },
      ),
    };
  }
  return { ok: true, access: { ...staff, email: staff.email } };
}

/** Só usado em page de login — redirect se já autenticado. */
export function redirectIfPlatformSession(access: PlatformAccess | null): void {
  if (access) redirect("/plataforma");
}

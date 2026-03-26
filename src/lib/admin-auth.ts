import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import type { User } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isClerkConfigured } from "@/lib/clerk-config";

function parseAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function getPrimaryEmail(user: User | null): string | undefined {
  const primary = user?.primaryEmailAddress?.emailAddress;
  if (primary) return primary;
  const first = user?.emailAddresses?.[0]?.emailAddress;
  return first ?? undefined;
}

/**
 * If ADMIN_EMAILS is set, only those emails may access admin.
 * In development, when ADMIN_EMAILS is empty, any signed-in user is allowed (easier local setup).
 * In production, an empty list denies admin access.
 */
export function isAdminUser(email: string | undefined | null): boolean {
  const allowed = parseAdminEmails();
  if (allowed.size === 0) {
    return process.env.NODE_ENV === "development";
  }
  if (!email) return false;
  return allowed.has(email.toLowerCase());
}

export type AdminApiAuthResult =
  | { ok: true; userId: string; email: string | undefined }
  | { ok: false; response: NextResponse };

export async function requireAdminApiAuth(): Promise<AdminApiAuthResult> {
  if (!isClerkConfigured()) {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        response: NextResponse.json(
          { message: "Autenticação não configurada." },
          { status: 503 },
        ),
      };
    }
    return { ok: true, userId: "dev-local", email: "dev@local" };
  }

  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Não autorizado." }, { status: 401 }),
    };
  }
  const user = await currentUser();
  const email = getPrimaryEmail(user);
  if (!isAdminUser(email)) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Acesso negado." }, { status: 403 }),
    };
  }
  return { ok: true, userId, email };
}

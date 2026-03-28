import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { clearSessionCookie } from "@/lib/admin-auth";
import { deleteSessionByRawToken, SESSION_COOKIE_NAME } from "@/lib/session-cookie";

export const dynamic = "force-dynamic";

export async function POST() {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE_NAME)?.value;
  await deleteSessionByRawToken(raw);
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { clearSessionCookie, getStaffAccessOrNull } from "@/lib/admin-auth";
import { getPostHogClient } from "@/lib/posthog-server";
import { PLATFORM_OPS_IMPERSONATOR_COOKIE } from "@/lib/platform-auth";
import { deleteSessionByRawToken, SESSION_COOKIE_NAME } from "@/lib/session-cookie";

export const dynamic = "force-dynamic";

export async function POST() {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE_NAME)?.value;

  const access = await getStaffAccessOrNull();

  await deleteSessionByRawToken(raw);
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  res.cookies.set(PLATFORM_OPS_IMPERSONATOR_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  if (access) {
    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: access.userId,
      event: "admin_logged_out",
      properties: { role: access.role, organization_id: access.organizationId },
    });
    await posthog.flush();
  }

  return res;
}

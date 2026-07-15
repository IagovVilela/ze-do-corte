import { NextResponse } from "next/server";

import { requirePlatformApiAuth } from "@/lib/platform-auth";
import { getPlatformOverview } from "@/lib/platform-ops";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePlatformApiAuth();
  if (!auth.ok) return auth.response;
  const overview = await getPlatformOverview();
  return NextResponse.json({ overview });
}

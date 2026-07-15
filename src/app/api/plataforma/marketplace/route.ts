import { NextResponse } from "next/server";

import { requirePlatformApiAuth } from "@/lib/platform-auth";
import { getPlatformMarketplaceSnapshot } from "@/lib/platform-ops";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePlatformApiAuth();
  if (!auth.ok) return auth.response;
  const data = await getPlatformMarketplaceSnapshot();
  return NextResponse.json(data);
}

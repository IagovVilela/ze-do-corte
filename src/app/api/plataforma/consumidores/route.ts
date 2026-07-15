import { NextResponse } from "next/server";

import { requirePlatformApiAuth } from "@/lib/platform-auth";
import { listPlatformConsumers } from "@/lib/platform-ops";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePlatformApiAuth();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const organizationId = url.searchParams.get("organizationId") ?? undefined;
  const daysRaw = Number(url.searchParams.get("days") ?? "30");
  const skip = Number(url.searchParams.get("skip") ?? "0");
  const take = Number(url.searchParams.get("take") ?? "50");
  const days = Number.isFinite(daysRaw) ? daysRaw : 30;

  const data = await listPlatformConsumers({
    q,
    organizationId: organizationId || undefined,
    days,
    skip: Number.isFinite(skip) ? skip : 0,
    take: Number.isFinite(take) ? take : 50,
  });

  return NextResponse.json(data);
}

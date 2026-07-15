import { NextResponse } from "next/server";

import { searchMarketplaceShops } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slugsRaw = searchParams.get("slugs") ?? "";
  const slugs = slugsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const shops = await searchMarketplaceShops({
    q: searchParams.get("q") ?? undefined,
    city: searchParams.get("city") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    slugs: slugs.length > 0 ? slugs : undefined,
  });
  return NextResponse.json({ shops, total: shops.length });
}

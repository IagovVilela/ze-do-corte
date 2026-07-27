import { NextResponse } from "next/server";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { getAdminReviewsSnapshot } from "@/lib/admin-reviews";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const ratingRaw = url.searchParams.get("rating")?.trim();
  const pageRaw = url.searchParams.get("page")?.trim();
  const rating =
    ratingRaw && /^\d+$/.test(ratingRaw) ? Number.parseInt(ratingRaw, 10) : null;
  const page =
    pageRaw && /^\d+$/.test(pageRaw) ? Number.parseInt(pageRaw, 10) : 1;

  try {
    const snap = await getAdminReviewsSnapshot(auth.access.organizationId, {
      rating,
      page,
    });
    return NextResponse.json(snap);
  } catch (error) {
    console.error("[admin reviews]", error);
    return NextResponse.json(
      { message: "Não foi possível carregar as avaliações." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";

import { requireAssistReadApiAuth } from "@/lib/admin-auth";
import { getAdminCrmSnapshot } from "@/lib/admin-crm";
import { maskEmail, maskPhone } from "@/lib/pii-mask";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAssistReadApiAuth();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const clubRaw = url.searchParams.get("club")?.trim() ?? "all";
  const riskRaw = url.searchParams.get("risk")?.trim() ?? "all";
  const sortRaw = url.searchParams.get("sort")?.trim() ?? "lastVisit";
  const pageRaw = url.searchParams.get("page")?.trim();

  const clubFilter =
    clubRaw === "club" || clubRaw === "none" ? clubRaw : "all";
  const riskFilter =
    riskRaw === "at_risk" ||
    riskRaw === "lost" ||
    riskRaw === "actionable"
      ? riskRaw
      : "all";
  const sort =
    sortRaw === "spent" ||
    sortRaw === "name" ||
    sortRaw === "visits" ||
    sortRaw === "risk" ||
    sortRaw === "lastVisit"
      ? sortRaw
      : "lastVisit";
  const page =
    pageRaw && /^\d+$/.test(pageRaw) ? Number.parseInt(pageRaw, 10) : 1;

  try {
    const snap = await getAdminCrmSnapshot(auth.access, {
      q,
      clubFilter,
      riskFilter,
      sort,
      page,
    });
    if (auth.access.role !== "SUPPORT_ASSIST") {
      return NextResponse.json(snap);
    }
    return NextResponse.json({
      ...snap,
      rows: snap.rows.map((row) => ({
        ...row,
        phone: maskPhone(row.phone),
        phoneKey: "",
        email: maskEmail(row.email),
        totalSpent: null,
        whatsappHref: null,
        whatsappWinBackHref: null,
      })),
    });
  } catch (error) {
    console.error("[admin crm]", error);
    return NextResponse.json(
      { message: "Não foi possível carregar os clientes." },
      { status: 500 },
    );
  }
}

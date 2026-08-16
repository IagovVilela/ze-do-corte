import { NextResponse } from "next/server";

import {
  appendSupportConsultantGateCookie,
  extractSupportGateFromSearchParams,
  isValidSupportConsultantGate,
} from "@/lib/consultant-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const k = extractSupportGateFromSearchParams(url.searchParams);

  if (!isValidSupportConsultantGate(k)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const dest = new URL("/consultores/login", url.origin);
  dest.searchParams.set("k", k!);

  const res = new NextResponse(null, {
    status: 307,
    headers: { Location: `${dest.pathname}${dest.search}` },
  });
  appendSupportConsultantGateCookie(res, k!);
  return res;
}

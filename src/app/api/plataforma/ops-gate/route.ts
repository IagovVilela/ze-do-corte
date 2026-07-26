import { NextResponse } from "next/server";

import {
  appendPlatformOpsGateCookie,
  extractOpsGateFromSearchParams,
  isValidPlatformOpsGate,
} from "@/lib/platform-auth";

export const dynamic = "force-dynamic";

/**
 * Alias de `/api/plataforma/gate` — grava cookie e redireciona ao login com `k` na URL
 * (fallback se o cookie não gravar no redirect).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const k = extractOpsGateFromSearchParams(url.searchParams);
  if (!isValidPlatformOpsGate(k)) {
    return new NextResponse(null, { status: 404 });
  }

  const erro = url.searchParams.get("erro");
  const dest = new URL("/plataforma/login", url.origin);
  dest.searchParams.set("k", k!);
  if (erro) dest.searchParams.set("erro", erro);

  const res = NextResponse.redirect(dest);
  appendPlatformOpsGateCookie(res, k!);
  return res;
}

import { NextResponse } from "next/server";

import {
  appendPlatformOpsGateCookie,
  isValidPlatformOpsGate,
} from "@/lib/platform-auth";

export const dynamic = "force-dynamic";

/**
 * Aceita `?k=PLATFORM_OPS_GATE`, grava cookie httpOnly e redireciona para o login Ops.
 * Necessário porque Server Components não podem chamar `cookies().set()`.
 * Location relativa preserva o Host que o cliente usou (evita 127.0.0.1 ↔ localhost).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const k = url.searchParams.get("k");
  const erro = url.searchParams.get("erro");

  if (!isValidPlatformOpsGate(k)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const dest = erro
    ? `/plataforma/login?erro=${encodeURIComponent(erro)}`
    : "/plataforma/login";

  const res = new NextResponse(null, {
    status: 307,
    headers: { Location: dest },
  });
  appendPlatformOpsGateCookie(res, k!);
  return res;
}

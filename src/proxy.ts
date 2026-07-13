import type { NextFetchEvent } from "next/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy de roteamento Barbernegon.
 * Autenticação do painel continua por sessão no banco (`/api/auth/login`).
 * Slugs reservados são tratados em `organization.ts` + páginas `[slug]`.
 */
export default function proxy(request: NextRequest, _event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  // Legacy mono-marca → tenant Zé do Corte
  if (pathname === "/agendar" || pathname.startsWith("/agendar/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/agendar/, "/ze-do-corte/agendar");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4)).*)",
    "/(api|trpc)(.*)",
  ],
};

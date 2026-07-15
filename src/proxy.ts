import type { NextFetchEvent } from "next/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  absoluteUrlOnHost,
  getMarketingHost,
  getMarketplaceHost,
  hostsSplitConfigured,
  isMarketingOnlyPath,
  isMarketplaceExplorePath,
  resolvePublicSurface,
} from "@/lib/public-hosts";

/**
 * Proxy de roteamento Barbernegon.
 * Autenticação do painel continua por sessão no banco (`/api/auth/login`).
 * Slugs reservados são tratados em `organization.ts` + páginas `[slug]`.
 * Com MARKETING_HOST + MARKETPLACE_HOST: isola landing B2B do marketplace.
 */
export default function proxy(request: NextRequest, _event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  const search = request.nextUrl.search;

  // Legacy mono-marca → tenant Zé do Corte
  if (pathname === "/agendar" || pathname.startsWith("/agendar/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/agendar/, "/ze-do-corte/agendar");
    return NextResponse.redirect(url);
  }

  if (hostsSplitConfigured()) {
    const surface = resolvePublicSurface(request.headers.get("host"));
    const marketingHost = getMarketingHost()!;
    const marketplaceHost = getMarketplaceHost()!;

    if (surface === "marketplace") {
      if (pathname === "/") {
        const url = request.nextUrl.clone();
        url.pathname = "/explorar";
        return NextResponse.rewrite(url);
      }

      if (isMarketingOnlyPath(pathname)) {
        return NextResponse.redirect(
          absoluteUrlOnHost(marketingHost, `${pathname}${search}`),
          301,
        );
      }
    }

    if (surface === "marketing" && isMarketplaceExplorePath(pathname)) {
      return NextResponse.redirect(
        absoluteUrlOnHost(marketplaceHost, `${pathname}${search}`),
        301,
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4)).*)",
    "/(api|trpc)(.*)",
  ],
};

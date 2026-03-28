import type { NextFetchEvent } from "next/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Proxy mínimo — autenticação do painel é por sessão no banco (`/api/auth/login`). */
export default function proxy(_request: NextRequest, _event: NextFetchEvent) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

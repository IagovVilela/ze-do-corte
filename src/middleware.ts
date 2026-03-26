import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextFetchEvent } from "next/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isAdminAppRoute = createRouteMatcher(["/admin(.*)"]);

const clerkMw = clerkMiddleware(async (auth, req) => {
  if (isAdminAppRoute(req)) {
    await auth.protect();
  }
});

function clerkPublishableKeyOk(): boolean {
  const k = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  return Boolean(k && k.startsWith("pk_") && k.length > 15);
}

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (!clerkPublishableKeyOk()) {
    return NextResponse.next();
  }
  return clerkMw(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

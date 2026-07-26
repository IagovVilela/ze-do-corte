import { NextResponse } from "next/server";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  absoluteUrlOnHost,
  getMarketplaceHost,
  hostsSplitConfigured,
} from "@/lib/public-hosts";
import { getPublicAppBaseUrl } from "@/lib/public-app-url";

export const dynamic = "force-dynamic";

function resolveShopAbsoluteUrl(slug: string, request: Request): string {
  const path = `/${slug}`;
  if (hostsSplitConfigured()) {
    return absoluteUrlOnHost(getMarketplaceHost()!, path);
  }
  const configured = getPublicAppBaseUrl();
  if (configured) return `${configured}${path}`;

  const protoHeader = request.headers.get("x-forwarded-proto");
  const hostHeader =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = (protoHeader?.split(",")[0] ?? "http").trim();
  const host = (hostHeader?.split(",")[0] ?? "").trim();
  if (host) return `${proto}://${host}${path}`;
  return path;
}

/**
 * PNG do QR do site público da organização autenticada.
 * GET /api/admin/shop-qr
 */
export async function GET(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  const org = await prisma.organization.findUnique({
    where: { id: auth.access.organizationId },
    select: { slug: true, name: true },
  });
  if (!org?.slug) {
    return NextResponse.json(
      { message: "Organização sem slug público." },
      { status: 400 },
    );
  }

  const shopUrl = resolveShopAbsoluteUrl(org.slug, request);
  const qrApi = new URL("https://api.qrserver.com/v1/create-qr-code/");
  qrApi.searchParams.set("size", "512x512");
  qrApi.searchParams.set("margin", "16");
  qrApi.searchParams.set("format", "png");
  qrApi.searchParams.set("data", shopUrl);

  let upstream: Response;
  try {
    upstream = await fetch(qrApi.toString(), {
      headers: { Accept: "image/png" },
      cache: "no-store",
    });
  } catch (error) {
    console.error("[shop-qr] falha ao gerar QR:", error);
    return NextResponse.json(
      { message: "Não foi possível gerar o QR code agora." },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    console.error("[shop-qr] upstream", upstream.status);
    return NextResponse.json(
      { message: "Serviço de QR code indisponível." },
      { status: 502 },
    );
  }

  const bytes = await upstream.arrayBuffer();
  const safeSlug = org.slug.replace(/[^a-z0-9-]+/gi, "-");
  const filename = `qr-${safeSlug}.png`;

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Shop-Url": shopUrl,
    },
  });
}

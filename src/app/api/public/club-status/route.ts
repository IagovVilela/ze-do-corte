import { NextResponse } from "next/server";

import {
  clubBadgeLabel,
  getClubSnapshotByPhone,
} from "@/lib/club-client-snapshot";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Preview público: assinatura do telefone no salão (badge no agendar). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("organizationSlug")?.trim() ?? "";
  const phone = url.searchParams.get("phone")?.trim() ?? "";
  if (!slug || !phone) {
    return NextResponse.json(
      { message: "Informe organizationSlug e phone." },
      { status: 400 },
    );
  }

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!org) {
    return NextResponse.json({ club: null });
  }

  const snap = await getClubSnapshotByPhone(org.id, phone);
  if (!snap || snap.status !== "ACTIVE") {
    return NextResponse.json({ club: null });
  }

  return NextResponse.json({
    club: {
      ...snap,
      badgeLabel: clubBadgeLabel(snap),
    },
  });
}

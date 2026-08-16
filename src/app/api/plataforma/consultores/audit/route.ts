import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { requirePlatformApiAuth } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePlatformApiAuth();
  if (!auth.ok) return auth.response;

  try {
    const logs = await prisma.$queryRaw<
      Array<{
        id: string;
        action: string;
        createdAt: Date;
        ticketId: string | null;
        consultantEmail: string;
        consultantName: string | null;
        orgName: string | null;
        orgSlug: string | null;
      }>
    >(Prisma.sql`
      SELECT
        l.id,
        l.action::text AS action,
        l."createdAt",
        l."ticketId",
        s.email AS "consultantEmail",
        s."displayName" AS "consultantName",
        o.name AS "orgName",
        o.slug AS "orgSlug"
      FROM "SupportAccessLog" l
      JOIN "StaffMember" s ON s.id = l."consultantStaffId"
      LEFT JOIN "Organization" o ON o.id = l."organizationId"
      ORDER BY l."createdAt" DESC
      LIMIT 200
    `);

    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        action: l.action,
        createdAt: l.createdAt,
        ticketId: l.ticketId,
        consultantStaff: {
          email: l.consultantEmail,
          displayName: l.consultantName,
        },
        organization: l.orgName
          ? { name: l.orgName, slug: l.orgSlug ?? "" }
          : null,
      })),
    });
  } catch (error) {
    console.error("GET /api/plataforma/consultores/audit", error);
    return NextResponse.json({ logs: [] });
  }
}

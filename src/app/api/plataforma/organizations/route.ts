import type { OrganizationPlanStatus, OrganizationPlanTier } from "@prisma/client";
import { NextResponse } from "next/server";

import { requirePlatformApiAuth } from "@/lib/platform-auth";
import { listPlatformOrganizations } from "@/lib/platform-ops";

export const dynamic = "force-dynamic";

const STATUSES = new Set(["TRIAL", "ACTIVE", "PAST_DUE", "CANCELLED"]);
const TIERS = new Set(["TRIAL_FULL", "STARTER", "FREE", "PRO"]);

export async function GET(request: Request) {
  const auth = await requirePlatformApiAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const statusRaw = searchParams.get("planStatus")?.toUpperCase();
  const tierRaw = searchParams.get("planTier")?.toUpperCase();

  const planStatus =
    statusRaw && STATUSES.has(statusRaw)
      ? (statusRaw as OrganizationPlanStatus)
      : undefined;
  const planTier =
    tierRaw && TIERS.has(tierRaw) ? (tierRaw as OrganizationPlanTier) : undefined;

  const organizations = await listPlatformOrganizations({
    q,
    planStatus,
    planTier,
  });
  return NextResponse.json({ organizations, total: organizations.length });
}

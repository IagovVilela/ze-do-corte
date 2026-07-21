import { NextResponse } from "next/server";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { getSupportContact } from "@/lib/support";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  return NextResponse.json({ contact: getSupportContact() });
}

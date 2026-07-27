import { NextResponse } from "next/server";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { getAdminOpsSnapshot } from "@/lib/admin-ops";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  try {
    const snapshot = await getAdminOpsSnapshot(auth.access);
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("[admin ops]", error);
    return NextResponse.json(
      { message: "Não foi possível carregar o operacional." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";

import { requirePlatformApiAuth } from "@/lib/platform-auth";
import { deletePlatformReview } from "@/lib/platform-ops";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requirePlatformApiAuth();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ message: "ID inválido." }, { status: 400 });
  }

  const ok = await deletePlatformReview(id);
  if (!ok) {
    return NextResponse.json(
      { message: "Avaliação não encontrada." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}

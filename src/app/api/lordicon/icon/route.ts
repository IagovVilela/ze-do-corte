import { NextResponse } from "next/server";
import { z } from "zod";

import { getLordIconLottieForSlot } from "@/lib/lordicon-server";
import { LORDICON_SLOTS } from "@/lib/lordicon-slots";

export const revalidate = 3600;

const querySchema = z.object({
  slot: z.enum(LORDICON_SLOTS),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ slot: searchParams.get("slot") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid or missing slot" }, { status: 400 });
  }

  try {
    const lottie = await getLordIconLottieForSlot(parsed.data.slot);
    return NextResponse.json(lottie, {
      headers: {
        "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Lordicon error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

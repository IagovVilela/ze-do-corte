import { NextResponse } from "next/server";

import { isWebPushConfigured } from "@/lib/web-push-config";

export const dynamic = "force-dynamic";

/**
 * Chave pública VAPID para o browser subscrever push (sem autenticação — é pública por especificação).
 */
export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? null;
  const configured = isWebPushConfigured();
  return NextResponse.json({
    enabled: configured && Boolean(publicKey),
    publicKey: configured ? publicKey : null,
  });
}

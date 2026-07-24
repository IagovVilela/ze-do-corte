import "server-only";

import { timingSafeEqual } from "node:crypto";

/**
 * Rate limit in-memory (best-effort). Em multi-instância reinicia por processo;
 * ainda reduz brute force e abuso óbvio.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

export function checkRateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const row = buckets.get(key);
  if (!row || row.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1 };
  }
  if (row.count >= opts.limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((row.resetAt - now) / 1000)),
    };
  }
  row.count += 1;
  return { ok: true, remaining: opts.limit - row.count };
}

/** IP do cliente: último hop de X-Forwarded-For (proxy confia no edge). */
export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    // Último = mais próximo do nosso edge (menos spoofável se o proxy sobrescreve).
    const pick = parts[parts.length - 1] ?? parts[0];
    if (pick) return pick.slice(0, 64);
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  return "unknown";
}

export function rateLimitResponse(retryAfterSec: number) {
  return {
    message: "Muitas tentativas. Aguarde e tente de novo.",
    retryAfterSec,
  };
}

/** Comparação constante para segredos de tamanho igual (tokens, gates). */
export function timingSafeEqualString(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

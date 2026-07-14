/** URL pública do app (webhooks, links absolutos). */
export function getPublicAppBaseUrl(): string | null {
  const explicit =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    process.env.PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const railway = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railway) {
    const host = railway.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }

  return null;
}

export function getAsaasWebhookUrl(): string | null {
  const base = getPublicAppBaseUrl();
  return base ? `${base}/api/webhooks/asaas` : null;
}

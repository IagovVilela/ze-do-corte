"use client";

import { shopPublicAbsoluteUrl } from "@/lib/public-hosts";

export function resolveClientShopUrl(slug: string): string {
  return shopPublicAbsoluteUrl(slug);
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback abaixo */
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

/** Baixa o PNG do QR via API autenticada do painel. */
export async function downloadShopQrPng(slug: string): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/shop-qr", {
      method: "GET",
      credentials: "same-origin",
    });
    if (!res.ok) return false;
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `qr-${slug.replace(/[^a-z0-9-]+/gi, "-")}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
    return true;
  } catch {
    return false;
  }
}

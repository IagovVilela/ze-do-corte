import "server-only";

import { LORDICON_CDN_BASE, LORDICON_SLOT_CDN_ID } from "@/lib/lordicon-cdn-ids";
import type { LordIconSlot } from "@/lib/lordicon-slots";

const LORDICON_API = "https://api.lordicon.com";

type LordIconApiItem = {
  family: string;
  style: string;
  index: number;
  name: string;
  title: string;
  premium: boolean;
  files: { preview?: string; svg?: string; json?: string };
};

const SLOT_QUERIES: Record<
  LordIconSlot,
  readonly { family: string; style: string; search: string }[]
> = {
  schedule: [
    { family: "wired", style: "outline", search: "calendar" },
    { family: "wired", style: "outline", search: "clock" },
  ],
  arrow: [
    { family: "wired", style: "outline", search: "arrow" },
    { family: "wired", style: "lineal", search: "arrow" },
  ],
  phone: [
    { family: "wired", style: "outline", search: "phone" },
    { family: "wired", style: "outline", search: "call" },
  ],
  chat: [
    { family: "wired", style: "outline", search: "chat" },
    { family: "wired", style: "outline", search: "bubble" },
  ],
  social: [
    { family: "wired", style: "outline", search: "instagram" },
    { family: "wired", style: "outline", search: "at" },
  ],
};

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function listIcons(
  token: string,
  q: { family: string; style: string; search: string },
): Promise<LordIconApiItem[]> {
  const url = new URL(`${LORDICON_API}/v1/icons`);
  url.searchParams.set("family", q.family);
  url.searchParams.set("style", q.style);
  url.searchParams.set("search", q.search);
  url.searchParams.set("premium", "false");
  url.searchParams.set("per_page", "25");

  const res = await fetch(url.toString(), {
    headers: authHeaders(token),
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Lordicon list failed ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.json() as Promise<LordIconApiItem[]>;
}

function pickWithJson(icons: LordIconApiItem[]): LordIconApiItem | undefined {
  return icons.find((i) => !i.premium && Boolean(i.files?.json));
}

async function fetchLottieFromUrl(
  token: string,
  jsonUrl: string,
): Promise<unknown> {
  let res = await fetch(jsonUrl, {
    headers: authHeaders(token),
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    res = await fetch(jsonUrl, { next: { revalidate: 3600 } });
  }

  if (!res.ok) {
    throw new Error(`Lordicon JSON fetch failed ${res.status}`);
  }

  return res.json() as Promise<unknown>;
}

/**
 * Lottie público no CDN Lordicon (sem Bearer). Fallback quando não há API token.
 */
async function fetchLottieFromCdn(slot: LordIconSlot): Promise<unknown> {
  const id = LORDICON_SLOT_CDN_ID[slot];
  const url = `${LORDICON_CDN_BASE}/${id}.json`;
  const res = await fetch(url, {
    next: { revalidate: 86_400 },
  });
  if (!res.ok) {
    throw new Error(`Lordicon CDN fetch failed ${res.status} for ${url}`);
  }
  return res.json() as Promise<unknown>;
}

/**
 * Resolve Lottie JSON para um slot da UI.
 *
 * - Com `LORDICON_API_TOKEN`: pesquisa na API Lordicon (ícones à escolha dinâmica).
 * - Sem token: usa JSON público em `cdn.lordicon.com` (`lordicon-cdn-ids.ts`).
 */
export async function getLordIconLottieForSlot(slot: LordIconSlot): Promise<unknown> {
  const token = process.env.LORDICON_API_TOKEN?.trim();
  if (!token) {
    return fetchLottieFromCdn(slot);
  }

  const attempts = SLOT_QUERIES[slot];
  let chosen: LordIconApiItem | undefined;

  for (const q of attempts) {
    const icons = await listIcons(token, q);
    chosen = pickWithJson(icons);
    if (chosen?.files?.json) break;
  }

  if (!chosen?.files?.json) {
    throw new Error(`No free Lordicon JSON found for slot "${slot}"`);
  }

  return fetchLottieFromUrl(token, chosen.files.json);
}

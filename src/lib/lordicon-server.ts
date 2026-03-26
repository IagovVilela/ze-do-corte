import "server-only";

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
 * Resolve Lottie JSON for a fixed UI slot using the Lordicon API (server-only).
 * Requires `LORDICON_API_TOKEN` in the environment.
 */
export async function getLordIconLottieForSlot(slot: LordIconSlot): Promise<unknown> {
  const token = process.env.LORDICON_API_TOKEN?.trim();
  if (!token) {
    throw new Error("LORDICON_API_TOKEN is not set");
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

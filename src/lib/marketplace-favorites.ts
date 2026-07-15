"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "barbernegon.marketplace.favorites";
const EMPTY_SLUGS: string[] = [];

type Listener = () => void;
const listeners = new Set<Listener>();

/** Snapshot estável enquanto o JSON no storage não muda. */
let cachedSnapshot: string[] = EMPTY_SLUGS;
let cachedRaw: string | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function readSlugs(): string[] {
  if (typeof window === "undefined") return EMPTY_SLUGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedSnapshot;
    cachedRaw = raw;
    if (!raw) {
      cachedSnapshot = EMPTY_SLUGS;
      return cachedSnapshot;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      cachedSnapshot = EMPTY_SLUGS;
      return cachedSnapshot;
    }
    cachedSnapshot = parsed
      .filter((s): s is string => typeof s === "string" && s.length > 0)
      .slice(0, 80);
    return cachedSnapshot;
  } catch {
    cachedRaw = null;
    cachedSnapshot = EMPTY_SLUGS;
    return EMPTY_SLUGS;
  }
}

function writeSlugs(slugs: string[]) {
  const next = JSON.stringify(slugs);
  window.localStorage.setItem(STORAGE_KEY, next);
  cachedRaw = next;
  cachedSnapshot = slugs.length === 0 ? EMPTY_SLUGS : slugs;
  emit();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      cachedRaw = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getServerSnapshot(): string[] {
  return EMPTY_SLUGS;
}

export function useMarketplaceFavorites() {
  const slugs = useSyncExternalStore(subscribe, readSlugs, getServerSnapshot);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const isFavorite = useCallback(
    (slug: string) => slugs.includes(slug),
    [slugs],
  );

  const toggleFavorite = useCallback((slug: string) => {
    const current = readSlugs();
    const next = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [slug, ...current.filter((s) => s !== slug)];
    writeSlugs(next);
  }, []);

  return {
    slugs,
    hydrated,
    isFavorite,
    toggleFavorite,
    count: slugs.length,
  };
}

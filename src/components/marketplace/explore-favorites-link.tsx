"use client";

import Link from "next/link";
import { Heart } from "lucide-react";

import { useMarketplaceFavorites } from "@/lib/marketplace-favorites";

/** Link “Favoritos” com contagem (só no cliente). */
export function ExploreFavoritesLink() {
  const { count, hydrated } = useMarketplaceFavorites();
  return (
    <Link
      href="/explorar/favoritos"
      className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-rose-200"
    >
      <Heart className="size-3.5" />
      Favoritos
      {hydrated && count > 0 ? (
        <span className="rounded-full bg-rose-500/20 px-1.5 text-[11px] font-semibold text-rose-200">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

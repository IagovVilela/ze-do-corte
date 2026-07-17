"use client";

import Link from "next/link";
import { Heart } from "lucide-react";

import { useMarketplaceFavorites } from "@/lib/marketplace-favorites";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/** Link “Favoritos” com contagem (só no cliente). */
export function ExploreFavoritesLink({ className }: Props) {
  const { count, hydrated } = useMarketplaceFavorites();
  return (
    <Link
      href="/explorar/favoritos"
      className={cn(
        "inline-flex items-center gap-1.5 transition",
        className ?? "text-sm text-zinc-400 hover:text-rose-200",
      )}
    >
      <Heart className="size-3.5" />
      Favoritos
      {hydrated && count > 0 ? (
        <span className="rounded-full bg-[#adc6ff]/20 px-1.5 text-[11px] font-semibold text-[#adc6ff]">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, LoaderCircle } from "lucide-react";

import { MarketplaceShopCard } from "@/components/marketplace/shop-card";
import { useMarketplaceFavorites } from "@/lib/marketplace-favorites";
import type { MarketplaceShop } from "@/lib/marketplace-shared";
import { marketplaceHomePath } from "@/lib/public-hosts";

export function FavoritesShopsList() {
  const { slugs, hydrated } = useMarketplaceFavorites();
  const [shops, setShops] = useState<MarketplaceShop[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (slugs.length === 0) {
      setShops([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/marketplace/shops?slugs=${encodeURIComponent(slugs.join(","))}`,
        );
        const data = (await res.json()) as { shops?: MarketplaceShop[] };
        if (!cancelled) setShops(data.shops ?? []);
      } catch {
        if (!cancelled) setShops([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, slugs]);

  if (!hydrated || loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-400">
        <LoaderCircle className="size-4 animate-spin" />
        Carregando favoritos…
      </div>
    );
  }

  if (slugs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-14 text-center">
        <Heart className="mx-auto size-8 text-zinc-600" />
        <p className="mt-3 text-zinc-300">Nenhuma barbearia favorita ainda.</p>
        <p className="mt-1 text-sm text-zinc-500">
          Toque no coração nos cards de /explorar para salvar neste aparelho.
        </p>
        <Link
          href={marketplaceHomePath()}
          className="mt-4 inline-block text-sm font-medium text-brand-300 hover:text-brand-200"
        >
          Explorar barbearias
        </Link>
      </div>
    );
  }

  if (shops.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 px-6 py-14 text-center text-sm text-zinc-400">
        Seus favoritos não estão listados no momento (pode ter saído da busca).
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3 xl:grid-cols-4">
      {shops.map((shop) => (
        <MarketplaceShopCard key={shop.id} shop={shop} />
      ))}
    </div>
  );
}

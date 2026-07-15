"use client";

import Link from "next/link";
import { Heart, MapPin, Star, X } from "lucide-react";
import { useState } from "react";

import { LocationMap } from "@/components/location-map";
import { useMarketplaceFavorites } from "@/lib/marketplace-favorites";
import {
  marketplaceCategoryLabel,
  type MarketplaceShop,
} from "@/lib/marketplace-shared";
import { cn } from "@/lib/utils";

type Props = {
  shop: MarketplaceShop;
};

function RatingBadge({
  avg,
  count,
}: {
  avg: number | null;
  count: number;
}) {
  if (!count || avg == null) {
    return (
      <span className="rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-zinc-300 backdrop-blur">
        Novo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-amber-200 backdrop-blur">
      <Star className="size-3 fill-amber-300 text-amber-300" />
      {avg.toFixed(1)}
      <span className="font-normal text-zinc-400">
        · {count} {count === 1 ? "avaliação" : "avaliações"}
      </span>
    </span>
  );
}

export function MarketplaceShopCard({ shop }: Props) {
  const imageUrl = shop.heroMediaUrl || shop.logoUrl;
  const location = [shop.addressLine, shop.city].filter(Boolean).join(" · ");
  const mapQuery = [shop.addressLine, shop.city].filter(Boolean).join(", ");
  const accent = shop.primaryColor || "#3b82f6";
  const { isFavorite, toggleFavorite, hydrated } = useMarketplaceFavorites();
  const [mapOpen, setMapOpen] = useState(false);
  const fav = hydrated && isFavorite(shop.slug);

  return (
    <>
      <article
        className={cn(
          "group relative flex w-[min(100%,320px)] shrink-0 flex-col overflow-hidden rounded-2xl md:w-full",
          "border border-white/10 bg-[#161b22] shadow-[0_12px_40px_rgba(0,0,0,0.35)]",
          "transition duration-300 hover:border-brand-500/40 hover:shadow-[0_16px_48px_rgba(59,130,246,0.18)]",
        )}
      >
        <Link
          href={`/${shop.slug}`}
          className="absolute inset-0 z-0"
          aria-label={`Abrir site de ${shop.name}`}
        />

        <div className="relative z-[1] pointer-events-none">
          <div
            className="relative aspect-[16/10] overflow-hidden"
            style={{
              background: `linear-gradient(145deg, ${accent}55 0%, #0f1419 70%)`,
            }}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full items-end p-4">
                <span className="text-3xl font-semibold tracking-tight text-white/90">
                  {shop.name.slice(0, 1).toUpperCase()}
                </span>
              </div>
            )}
            <div className="absolute left-3 top-3">
              <RatingBadge avg={shop.ratingAvg} count={shop.ratingCount} />
            </div>
            {shop.city ? (
              <div className="absolute bottom-3 left-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-zinc-100 backdrop-blur">
                  <MapPin className="size-3 text-brand-300" />
                  {shop.city}
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col gap-3 p-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-50">
                {shop.name}
              </h2>
              {location ? (
                <p className="mt-1 flex items-start gap-1.5 text-sm text-zinc-400">
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-brand-300" />
                  <span>{location}</span>
                </p>
              ) : shop.unitName ? (
                <p className="mt-1 text-sm text-zinc-500">{shop.unitName}</p>
              ) : null}
              {shop.slogan ? (
                <p className="mt-2 line-clamp-2 text-sm text-zinc-500">
                  {shop.slogan}
                </p>
              ) : null}
            </div>

            {shop.services.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {shop.services.slice(0, 4).map((svc) => (
                  <span
                    key={svc.id}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-zinc-300"
                  >
                    {svc.name}
                  </span>
                ))}
                {shop.services[0] ? (
                  <span className="rounded-full border border-brand-500/20 bg-brand-500/10 px-2.5 py-0.5 text-[11px] text-brand-200">
                    {marketplaceCategoryLabel(shop.services[0].category)}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="relative z-[2] mt-auto space-y-2 border-t border-white/10 p-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(shop.slug);
              }}
              className={cn(
                "inline-flex size-11 items-center justify-center rounded-xl border transition",
                fav
                  ? "border-rose-400/40 bg-rose-500/15 text-rose-300"
                  : "border-white/15 bg-white/[0.04] text-zinc-300 hover:border-rose-400/30 hover:text-rose-200",
              )}
              aria-label={fav ? "Remover dos favoritos" : "Favoritar"}
              title={fav ? "Remover dos favoritos" : "Favoritar"}
            >
              <Heart className={cn("size-4", fav && "fill-current")} />
            </button>
            {mapQuery ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMapOpen(true);
                }}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-brand-500/40 hover:bg-brand-500/10"
              >
                <MapPin className="size-3.5 text-brand-300" />
                Ver no mapa
              </button>
            ) : (
              <span className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/10 px-3 py-2.5 text-xs text-zinc-500">
                Sem endereço cadastrado
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              href={`/${shop.slug}`}
              className="flex-1 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-center text-sm font-semibold text-zinc-100 transition hover:border-brand-500/40 hover:bg-brand-500/10"
            >
              Ver site
            </Link>
            <Link
              href={`/${shop.slug}/agendar`}
              className="flex-1 rounded-xl bg-brand-500 px-3 py-2.5 text-center text-sm font-semibold text-zinc-950 transition hover:bg-brand-400"
            >
              Agendar
            </Link>
          </div>
        </div>
      </article>

      {mapOpen && mapQuery ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal
          aria-label={`Mapa de ${shop.name}`}
          onClick={() => setMapOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#12171e] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{shop.name}</p>
                <p className="mt-0.5 text-xs text-zinc-400">{location}</p>
              </div>
              <button
                type="button"
                onClick={() => setMapOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </div>
            <LocationMap query={mapQuery} mapTitle={shop.name} />
          </div>
        </div>
      ) : null}
    </>
  );
}

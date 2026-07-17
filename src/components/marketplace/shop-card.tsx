"use client";

import Link from "next/link";
import { Heart, MapPin, MapPinOff, Star, X } from "lucide-react";
import { useState } from "react";

import { LocationMap } from "@/components/location-map";
import { ShopReviewsModal } from "@/components/marketplace/shop-reviews-modal";
import { useMarketplaceFavorites } from "@/lib/marketplace-favorites";
import type { MarketplaceShop } from "@/lib/marketplace-shared";
import { cn } from "@/lib/utils";

type Props = {
  shop: MarketplaceShop;
};

function RatingBadge({
  avg,
  count,
  onOpen,
}: {
  avg: number | null;
  count: number;
  onOpen: () => void;
}) {
  if (!count || avg == null) {
    return (
      <span className="rounded-full bg-[#C5A059] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#0b0e15]">
        Novo
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpen();
      }}
      className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-amber-200 backdrop-blur transition hover:bg-black/75"
      aria-label={`Ver ${count} avaliações`}
      title="Ver avaliações"
    >
      <Star className="size-3 fill-amber-300 text-amber-300" />
      {avg.toFixed(1)}
      <span className="font-normal text-zinc-400">
        · {count} {count === 1 ? "avaliação" : "avaliações"}
      </span>
    </button>
  );
}

export function MarketplaceShopCard({ shop }: Props) {
  const imageUrl = shop.heroMediaUrl || shop.logoUrl;
  const location = [shop.addressLine, shop.city].filter(Boolean).join(" · ");
  const mapQuery = [shop.addressLine, shop.city].filter(Boolean).join(", ");
  const accent = shop.primaryColor || "#adc6ff";
  const initial = shop.name.slice(0, 1).toUpperCase();
  const { isFavorite, toggleFavorite, hydrated } = useMarketplaceFavorites();
  const [mapOpen, setMapOpen] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const fav = hydrated && isFavorite(shop.slug);

  return (
    <>
      <article
        className={cn(
          "explore-shop-card group relative flex flex-col overflow-hidden rounded-xl",
          "border border-[#2F3336] bg-[#25282B]",
          "transition-all duration-300",
        )}
      >
        <div className="relative h-48 overflow-hidden bg-[#32353c]">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{
                background: `linear-gradient(145deg, ${accent}44 0%, #10131a 75%)`,
              }}
            />
          )}

          <div className="absolute left-4 top-4 z-[1] flex gap-2">
            <RatingBadge
              avg={shop.ratingAvg}
              count={shop.ratingCount}
              onOpen={() => setReviewsOpen(true)}
            />
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(shop.slug);
            }}
            className={cn(
              "absolute right-4 top-4 z-[2] inline-flex size-10 items-center justify-center rounded-lg border backdrop-blur-md transition",
              fav
                ? "border-rose-400/40 bg-rose-500/20 text-rose-300"
                : "border-[#2F3336] bg-[#25282B]/90 text-[#c2c6d6] hover:text-rose-200",
            )}
            aria-label={fav ? "Remover dos favoritos" : "Favoritar"}
            title={fav ? "Remover dos favoritos" : "Favoritar"}
          >
            <Heart className={cn("size-4", fav && "fill-current")} />
          </button>

          <div className="absolute bottom-4 left-4 z-[1] flex size-12 items-center justify-center rounded-lg border border-[#2F3336] bg-[#25282B]/90 font-explore-headline text-xl font-semibold text-[#adc6ff] backdrop-blur-md">
            {initial}
          </div>
        </div>

        <div className="flex flex-grow flex-col p-6">
          {shop.unitName ? (
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9CA3AF]">
              {shop.unitName}
            </p>
          ) : (
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9CA3AF]">
              Unidade principal
            </p>
          )}
          <h3 className="mb-2 font-explore-headline text-xl font-semibold leading-snug text-[#e1e2ec]">
            {shop.name}
          </h3>
          {shop.slogan ? (
            <p className="mb-4 line-clamp-1 text-sm text-[#c2c6d6]">
              {shop.slogan}
            </p>
          ) : null}

          {shop.services.length > 0 ? (
            <div className="mb-6 flex flex-wrap gap-2">
              {shop.services.slice(0, 3).map((svc) => (
                <span
                  key={svc.id}
                  className="rounded border border-[#2F3336] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]"
                >
                  {svc.name}
                </span>
              ))}
            </div>
          ) : (
            <div className="mb-6" />
          )}

          <div className="mt-auto space-y-3">
            {mapQuery ? (
              <button
                type="button"
                onClick={() => setMapOpen(true)}
                className="mb-1 flex w-full items-center gap-2 text-left text-[13px] text-[#9CA3AF] transition hover:text-[#adc6ff]"
              >
                <MapPin className="size-4 shrink-0" />
                <span className="line-clamp-1">{location}</span>
              </button>
            ) : (
              <div className="mb-1 flex items-center gap-2 text-[13px] text-[#9CA3AF]">
                <MapPinOff className="size-4 shrink-0" />
                Sem endereço cadastrado
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Link
                href={`/${shop.slug}`}
                className="flex items-center justify-center rounded-lg border border-[#2F3336] py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[#e1e2ec] transition hover:bg-[#32353c]"
              >
                Ver site
              </Link>
              <Link
                href={`/${shop.slug}/agendar`}
                className="flex items-center justify-center rounded-lg bg-[#adc6ff] py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[#00285d] transition hover:brightness-110"
              >
                Agendar
              </Link>
            </div>
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
            className="w-full max-w-lg rounded-xl border border-[#2F3336] bg-[#12171e] p-4 shadow-2xl"
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

      <ShopReviewsModal
        slug={shop.slug}
        shopName={shop.name}
        open={reviewsOpen}
        onClose={() => setReviewsOpen(false)}
      />
    </>
  );
}

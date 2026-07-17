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
        {/* Toque no card → agendar (favoritos/mapa/site ficam fora) */}
        <Link
          href={`/${shop.slug}/agendar`}
          className="absolute inset-0 z-0"
          aria-label={`Agendar em ${shop.name}`}
        />

        <div className="pointer-events-none relative z-[1]">
          <div className="relative h-40 overflow-hidden bg-[#32353c] sm:h-48">
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

            <div className="absolute left-3 top-3 flex gap-2 sm:left-4 sm:top-4">
              <RatingBadge
                avg={shop.ratingAvg}
                count={shop.ratingCount}
                onOpen={() => setReviewsOpen(true)}
              />
            </div>

            <div className="absolute bottom-3 left-3 flex size-10 items-center justify-center rounded-lg border border-[#2F3336] bg-[#25282B]/90 font-explore-headline text-lg font-semibold text-[#adc6ff] backdrop-blur-md sm:bottom-4 sm:left-4 sm:size-12 sm:text-xl">
              {initial}
            </div>
          </div>

          <div className="flex flex-col p-4 sm:p-6">
            {shop.unitName ? (
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9CA3AF]">
                {shop.unitName}
              </p>
            ) : (
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9CA3AF]">
                Unidade principal
              </p>
            )}
            <h3 className="mb-2 font-explore-headline text-lg font-semibold leading-snug text-[#e1e2ec] sm:text-xl">
              {shop.name}
            </h3>
            {shop.slogan ? (
              <p className="mb-3 line-clamp-2 text-sm text-[#c2c6d6] sm:mb-4 sm:line-clamp-1">
                {shop.slogan}
              </p>
            ) : null}

            {shop.services.length > 0 ? (
              <div className="mb-4 flex flex-wrap gap-2 sm:mb-6">
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
              <div className="mb-4 sm:mb-6" />
            )}
          </div>
        </div>

        <div className="relative z-[2] mt-auto space-y-3 px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(shop.slug);
              }}
              className={cn(
                "inline-flex size-10 shrink-0 items-center justify-center rounded-lg border transition",
                fav
                  ? "border-rose-400/40 bg-rose-500/20 text-rose-300"
                  : "border-[#2F3336] bg-[#25282B] text-[#c2c6d6] hover:text-rose-200",
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
                className="flex min-w-0 flex-1 items-center gap-2 text-left text-[13px] text-[#9CA3AF] transition hover:text-[#adc6ff]"
              >
                <MapPin className="size-4 shrink-0" />
                <span className="line-clamp-1">{location}</span>
              </button>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-[#9CA3AF]">
                <MapPinOff className="size-4 shrink-0" />
                <span className="line-clamp-1">Sem endereço cadastrado</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Link
              href={`/${shop.slug}`}
              className="flex items-center justify-center rounded-lg border border-[#2F3336] py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[#e1e2ec] transition hover:bg-[#32353c]"
              onClick={(e) => e.stopPropagation()}
            >
              Ver site
            </Link>
            <Link
              href={`/${shop.slug}/agendar`}
              className="flex items-center justify-center rounded-lg bg-[#adc6ff] py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-[#00285d] transition hover:brightness-110"
              onClick={(e) => e.stopPropagation()}
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

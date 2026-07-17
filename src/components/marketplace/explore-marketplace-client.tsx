"use client";

import { useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Info,
  LocateFixed,
  LoaderCircle,
  MapPin,
  Search,
} from "lucide-react";

import { ExploreChrome } from "@/components/marketplace/explore-chrome";
import { ExploreHeroCarousel } from "@/components/marketplace/explore-hero-carousel";
import { MarketplaceShopCard } from "@/components/marketplace/shop-card";
import {
  MARKETPLACE_CATEGORY_CHIPS,
  type MarketplaceShop,
} from "@/lib/marketplace-shared";
import { marketplaceHomePath } from "@/lib/public-hosts";
import { cn } from "@/lib/utils";

type Props = {
  initialQ: string;
  initialCity: string;
  initialCategory: string;
  initialShops: MarketplaceShop[];
};

export function ExploreMarketplaceClient({
  initialQ,
  initialCity,
  initialCategory,
  initialShops,
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [city, setCity] = useState(initialCity);
  const [category, setCategory] = useState(initialCategory.toUpperCase());
  const [shops, setShops] = useState(initialShops);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locMessage, setLocMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const searchSeq = useRef(0);
  const skipFirstEffect = useRef(true);
  const resultsRef = useRef<HTMLElement>(null);

  const runSearch = useEffectEvent(
    async (next: { q: string; city: string; category: string }) => {
      const seq = ++searchSeq.current;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (next.q.trim()) params.set("q", next.q.trim());
        if (next.city.trim()) params.set("city", next.city.trim());
        if (next.category.trim()) params.set("category", next.category.trim());
        const res = await fetch(`/api/marketplace/shops?${params.toString()}`);
        const data = (await res.json()) as { shops?: MarketplaceShop[] };
        if (seq !== searchSeq.current) return;
        setShops(data.shops ?? []);

        const qs = params.toString();
        const home = marketplaceHomePath();
        startTransition(() => {
          router.replace(qs ? `${home}?${qs}` : home, { scroll: false });
        });
      } catch {
        /* mantém lista atual */
      } finally {
        if (seq === searchSeq.current) setLoading(false);
      }
    },
  );

  useEffect(() => {
    if (skipFirstEffect.current) {
      skipFirstEffect.current = false;
      return;
    }
    const handle = window.setTimeout(() => {
      void runSearch({ q, city, category });
    }, 280);
    return () => window.clearTimeout(handle);
  }, [q, city, category]);

  const useMyLocation = useCallback(async () => {
    setLocMessage(null);
    if (!navigator.geolocation) {
      setLocMessage("Seu navegador não suporta localização.");
      return;
    }
    setLocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 12_000,
          maximumAge: 60_000,
        });
      });
      const res = await fetch(
        `/api/marketplace/geocode?lat=${encodeURIComponent(String(pos.coords.latitude))}&lon=${encodeURIComponent(String(pos.coords.longitude))}`,
      );
      const data = (await res.json()) as { city?: string; message?: string };
      if (!res.ok || !data.city) {
        setLocMessage(data.message ?? "Não foi possível detectar a cidade.");
        return;
      }
      setCity(data.city);
      setLocMessage(`Cidade detectada: ${data.city}`);
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? Number((err as GeolocationPositionError).code)
          : null;
      if (code === 1) setLocMessage("Permissão de localização negada.");
      else if (code === 2) setLocMessage("Não foi possível obter a posição.");
      else if (code === 3) setLocMessage("Tempo esgotado ao obter a localização.");
      else setLocMessage("Não foi possível usar sua localização.");
    } finally {
      setLocating(false);
    }
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void runSearch({ q, city, category });
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearFilters() {
    setQ("");
    setCity("");
    setCategory("");
  }

  const titleParts: string[] = [];
  if (q.trim()) titleParts.push(`“${q.trim()}”`);
  if (city.trim()) titleParts.push(`em ${city.trim()}`);
  const heading =
    titleParts.length > 0
      ? `Barbearias ${titleParts.join(" ")} (${shops.length})`
      : `Barbearias na Barbernegon (${shops.length})`;

  return (
    <ExploreChrome>
      <main className="min-h-screen">
        {/* Mobile: altura natural; desktop: hero imersivo */}
        <section className="relative flex flex-col overflow-hidden md:min-h-[600px] md:h-[80vh] md:items-center md:justify-center">
          <div className="pointer-events-none absolute inset-0 max-md:min-h-[280px] max-md:h-[42vh]">
            <ExploreHeroCarousel />
            <div className="explore-hero-overlay absolute inset-0 z-10" />
          </div>

          <div className="relative z-20 mx-auto flex w-full max-w-[1280px] flex-1 flex-col justify-center px-4 pb-6 pt-8 sm:px-6 md:pb-20 md:pt-0">
            <div className="mx-auto w-full max-w-4xl text-center">
              <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-[#adc6ff] sm:mb-4 sm:text-xs">
                Marketplace
              </span>
              <h1 className="mb-3 font-explore-headline text-[1.75rem] font-bold leading-[1.15] tracking-[-0.02em] text-[#e1e2ec] sm:mb-4 sm:text-4xl md:text-5xl">
                Encontre sua barbearia
              </h1>
              <p className="mx-auto mb-5 max-w-2xl text-sm text-[#e1e2ec]/90 sm:mb-8 sm:text-base md:text-lg">
                <span className="md:hidden">
                  Busque por serviço ou cidade. Use{" "}
                  <strong className="font-semibold">Perto de mim</strong> com
                  GPS.
                </span>
                <span className="hidden md:inline">
                  Digite a cidade mesmo incompleta. Os resultados atualizam
                  enquanto você digita. Use{" "}
                  <strong className="font-semibold text-[#e1e2ec]">
                    Perto de mim
                  </strong>{" "}
                  com permissão de localização.
                </span>
              </p>

              <form
                onSubmit={onSubmit}
                className="explore-search-container flex flex-col items-stretch gap-2 rounded-xl border border-white/10 bg-[#25282B]/90 p-2 shadow-2xl backdrop-blur-xl transition-all md:flex-row md:p-3"
              >
                <label className="flex min-h-11 flex-grow items-center gap-3 px-3 sm:px-4">
                  <Search className="size-5 shrink-0 text-[#9CA3AF]" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Serviço ou barbearia"
                    className="w-full bg-transparent py-2.5 text-base text-[#e1e2ec] outline-none placeholder:text-[#9CA3AF] sm:py-3"
                    aria-label="Serviço ou barbearia"
                  />
                </label>
                <div className="my-1 hidden w-px bg-[#2F3336] md:my-2 md:block" />
                <label className="flex min-h-11 flex-grow items-center gap-3 px-3 sm:px-4">
                  <MapPin className="size-5 shrink-0 text-[#9CA3AF]" />
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Cidade (ex.: sao jose)"
                    className="w-full bg-transparent py-2.5 text-base text-[#e1e2ec] outline-none placeholder:text-[#9CA3AF] sm:py-3"
                    aria-label="Cidade"
                    autoComplete="address-level2"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void useMyLocation()}
                    disabled={locating}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-[#2F3336] bg-white/5 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#e1e2ec] transition hover:bg-[#1d2027] disabled:opacity-60 sm:gap-2 sm:px-6 sm:text-xs sm:tracking-[0.1em]"
                  >
                    {locating ? (
                      <LoaderCircle className="size-4 animate-spin sm:size-[18px]" />
                    ) : (
                      <LocateFixed className="size-4 sm:size-[18px]" />
                    )}
                    <span className="truncate">
                      {locating ? "GPS…" : "Perto de mim"}
                    </span>
                  </button>
                  <button
                    type="submit"
                    className="min-h-11 rounded-lg bg-[#adc6ff] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#00285d] shadow-lg shadow-[#adc6ff]/20 transition hover:brightness-110 active:scale-[0.97] sm:px-10 sm:text-xs sm:tracking-[0.1em]"
                  >
                    Buscar
                  </button>
                </div>
              </form>

              {locMessage ? (
                <p className="mt-3 text-left text-sm text-[#9CA3AF] sm:text-center">
                  {locMessage}
                </p>
              ) : null}

              <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:mt-8 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0">
                {MARKETPLACE_CATEGORY_CHIPS.map((chip) => {
                  const active =
                    (chip.id === "" && !category) || chip.id === category;
                  return (
                    <button
                      key={chip.id || "all"}
                      type="button"
                      onClick={() => setCategory(chip.id)}
                      className={cn(
                        "shrink-0 rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.1em] transition-all sm:px-6 sm:text-xs",
                        active
                          ? "border-[#adc6ff] bg-[#adc6ff] font-bold text-[#00285d] shadow-lg shadow-[#adc6ff]/20"
                          : "border-white/10 bg-[#25282B]/50 text-[#c2c6d6] backdrop-blur-md hover:border-[#adc6ff] hover:text-[#adc6ff]",
                      )}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              {/* Dica inline no mobile (no desktop fica flutuante embaixo) */}
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-left text-xs text-[#9CA3AF] backdrop-blur-md sm:items-center sm:rounded-full sm:px-4 sm:text-sm md:hidden">
                <Info className="mt-0.5 size-4 shrink-0 sm:mt-0" />
                <p>
                  Dica: digite parte da cidade (ex.{" "}
                  <span className="font-bold text-[#e1e2ec]">sao</span>) — a
                  lista atualiza sozinha.
                </p>
              </div>
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 z-20 hidden w-full max-w-2xl -translate-x-1/2 px-4 md:block">
            <div className="flex items-center justify-center gap-2 rounded-full border border-white/10 bg-black/40 px-6 py-3 text-sm text-[#9CA3AF] backdrop-blur-md">
              <Info className="size-[18px] shrink-0" />
              <p>
                Dica: digite parte da cidade (ex.{" "}
                <span className="font-bold text-[#e1e2ec]">sao</span>) — a lista
                atualiza sozinha.
              </p>
            </div>
          </div>
        </section>

        <section
          ref={resultsRef}
          id="resultados"
          className="mx-auto max-w-[1280px] px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-12 md:pt-16"
        >
          <div className="mb-5 flex items-start justify-between gap-3 sm:mb-8 sm:items-end">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <h2 className="font-explore-headline text-xl font-semibold leading-snug tracking-tight text-[#e1e2ec] sm:text-2xl md:text-[32px] md:leading-[1.2]">
                {heading}
              </h2>
              {loading ? (
                <LoaderCircle
                  className="size-4 shrink-0 animate-spin text-[#adc6ff] sm:size-5"
                  aria-label="Atualizando resultados"
                />
              ) : null}
            </div>
            {q || city || category ? (
              <button
                type="button"
                onClick={clearFilters}
                className="shrink-0 pt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#adc6ff] hover:underline sm:text-xs"
              >
                Ver todas
              </button>
            ) : null}
          </div>

          {shops.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#2F3336] bg-[#25282B]/40 px-6 py-14 text-center">
              <p className="text-[#e1e2ec]">Nenhuma barbearia encontrada.</p>
              <p className="mt-2 text-sm text-[#9CA3AF]">
                Tente outro termo, outra cidade ou limpe os filtros.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 inline-block text-sm font-medium text-[#adc6ff] hover:underline"
              >
                Limpar busca
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shops.map((shop) => (
                <MarketplaceShopCard key={shop.id} shop={shop} />
              ))}
            </div>
          )}
        </section>
      </main>
    </ExploreChrome>
  );
}

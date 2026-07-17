"use client";

import Link from "next/link";
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
        <section className="relative flex min-h-[600px] h-[80vh] items-center justify-center overflow-hidden">
          <ExploreHeroCarousel />
          <div className="explore-hero-overlay absolute inset-0 z-10" />

          <div className="relative z-20 mx-auto w-full max-w-[1280px] px-4 text-center sm:px-6">
            <div className="mx-auto max-w-4xl">
              <span className="mb-4 block text-xs font-bold uppercase tracking-[0.2em] text-[#adc6ff]">
                Marketplace
              </span>
              <h1 className="mb-4 font-explore-headline text-4xl font-bold leading-[1.1] tracking-[-0.02em] text-[#e1e2ec] sm:text-5xl">
                Encontre sua barbearia
              </h1>
              <p className="mx-auto mb-8 max-w-2xl text-base text-[#e1e2ec]/90 sm:text-lg">
                Digite a cidade mesmo incompleta. Os resultados atualizam enquanto
                você digita. Use{" "}
                <strong className="font-semibold text-[#e1e2ec]">
                  Perto de mim
                </strong>{" "}
                com permissão de localização.
              </p>

              <form
                onSubmit={onSubmit}
                className="explore-search-container flex flex-col items-stretch gap-2 rounded-xl border border-white/10 bg-[#25282B]/80 p-2 shadow-2xl backdrop-blur-xl transition-all md:flex-row md:p-3"
              >
                <label className="flex flex-grow items-center gap-3 px-4">
                  <Search className="size-5 shrink-0 text-[#9CA3AF]" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Pesquise serviços ou empresas"
                    className="w-full bg-transparent py-3 text-base text-[#e1e2ec] outline-none placeholder:text-[#9CA3AF]"
                    aria-label="Serviço ou barbearia"
                  />
                </label>
                <div className="my-2 hidden w-px bg-[#2F3336] md:block" />
                <label className="flex flex-grow items-center gap-3 px-4">
                  <MapPin className="size-5 shrink-0 text-[#9CA3AF]" />
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Cidade (ex.: sao jose)"
                    className="w-full bg-transparent py-3 text-base text-[#e1e2ec] outline-none placeholder:text-[#9CA3AF]"
                    aria-label="Cidade"
                    autoComplete="address-level2"
                  />
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void useMyLocation()}
                    disabled={locating}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#2F3336] bg-white/5 px-6 py-3 text-xs font-bold uppercase tracking-[0.1em] text-[#e1e2ec] transition hover:bg-[#1d2027] disabled:opacity-60"
                  >
                    {locating ? (
                      <LoaderCircle className="size-[18px] animate-spin" />
                    ) : (
                      <LocateFixed className="size-[18px]" />
                    )}
                    {locating ? "Detectando…" : "Perto de mim"}
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#adc6ff] px-10 py-3 text-xs font-bold uppercase tracking-[0.1em] text-[#00285d] shadow-lg shadow-[#adc6ff]/20 transition hover:brightness-110 active:scale-[0.97]"
                  >
                    Buscar
                  </button>
                </div>
              </form>

              {locMessage ? (
                <p className="mt-3 text-sm text-[#9CA3AF]">{locMessage}</p>
              ) : null}

              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {MARKETPLACE_CATEGORY_CHIPS.map((chip) => {
                  const active =
                    (chip.id === "" && !category) || chip.id === category;
                  return (
                    <button
                      key={chip.id || "all"}
                      type="button"
                      onClick={() => setCategory(chip.id)}
                      className={cn(
                        "rounded-full border px-6 py-2 text-xs font-bold uppercase tracking-[0.1em] transition-all",
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
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 z-20 w-full max-w-2xl -translate-x-1/2 px-4">
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
          className="mx-auto max-w-[1280px] px-4 pb-16 pt-16 sm:px-6"
        >
          <div className="mb-8 flex items-end justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="font-explore-headline text-2xl font-semibold tracking-tight text-[#e1e2ec] sm:text-[32px] sm:leading-[1.2]">
                {heading}
              </h2>
              {loading ? (
                <LoaderCircle
                  className="size-5 animate-spin text-[#adc6ff]"
                  aria-label="Atualizando resultados"
                />
              ) : null}
            </div>
            {q || city || category ? (
              <button
                type="button"
                onClick={clearFilters}
                className="shrink-0 text-xs font-bold uppercase tracking-[0.1em] text-[#adc6ff] hover:underline"
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
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

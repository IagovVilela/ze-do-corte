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
import { LocateFixed, LoaderCircle, MapPin, Search } from "lucide-react";

import { ExploreFavoritesLink } from "@/components/marketplace/explore-favorites-link";
import { MarketplaceShopCard } from "@/components/marketplace/shop-card";
import {
  MARKETPLACE_CATEGORY_CHIPS,
  type MarketplaceShop,
} from "@/lib/marketplace-shared";
import { marketplaceHomePath, publicSurfaceUrl } from "@/lib/public-hosts";
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
  }

  const titleParts: string[] = [];
  if (q.trim()) titleParts.push(`“${q.trim()}”`);
  if (city.trim()) titleParts.push(`em ${city.trim()}`);
  const heading =
    titleParts.length > 0
      ? `Barbearias ${titleParts.join(" ")} (${shops.length})`
      : `Barbearias na Barbernegon (${shops.length})`;

  return (
    <div className="min-h-svh bg-[#0f1419] text-zinc-100">
      <header className="border-b border-white/10 bg-[#0f1419]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href={marketplaceHomePath()}
            className="text-lg font-semibold tracking-tight text-white"
          >
            Barbernegon
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <ExploreFavoritesLink />
            <Link
              href={publicSurfaceUrl("marketing", "/cadastro")}
              className="text-zinc-400 transition hover:text-brand-200"
            >
              Para o salão
            </Link>
            <Link
              href={publicSurfaceUrl("marketing", "/admin/login")}
              className="rounded-full border border-white/15 px-3 py-1.5 text-zinc-200 hover:border-brand-500/40"
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
            Marketplace
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Encontre sua barbearia
          </h1>
          <p className="max-w-2xl text-sm text-zinc-400 sm:text-base">
            Digite a cidade mesmo incompleta (ex.:{" "}
            <span className="text-zinc-300">sao jose</span> → São José dos Campos).
            Os resultados atualizam enquanto você digita. Use{" "}
            <strong className="font-medium text-zinc-300">Perto de mim</strong>{" "}
            com permissão de localização.
          </p>
        </div>

        <div className="space-y-4">
          <form
            onSubmit={onSubmit}
            className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#161b22]/90 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur md:flex-row md:items-center"
          >
            <label className="flex flex-1 items-center gap-2 px-3 py-2">
              <Search className="size-4 shrink-0 text-zinc-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquise serviços ou empresas"
                className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                aria-label="Serviço ou barbearia"
              />
            </label>
            <div className="hidden h-8 w-px bg-white/10 md:block" />
            <div className="flex flex-1 items-center gap-1 px-2 py-1 md:px-3">
              <MapPin className="size-4 shrink-0 text-zinc-500" />
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Cidade (ex.: sao jose)"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                aria-label="Cidade"
                autoComplete="address-level2"
              />
              <button
                type="button"
                onClick={() => void useMyLocation()}
                disabled={locating}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-brand-500/40 hover:bg-brand-500/10 disabled:opacity-60"
                title="Usar minha localização"
                aria-label="Usar minha localização"
              >
                {locating ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <LocateFixed className="size-3.5 text-brand-300" />
                )}
                <span className="hidden sm:inline">
                  {locating ? "Detectando…" : "Perto de mim"}
                </span>
              </button>
            </div>
            <button
              type="submit"
              className="rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-brand-400 md:self-stretch"
            >
              Buscar
            </button>
          </form>

          {locMessage ? (
            <p className="text-xs text-zinc-400">{locMessage}</p>
          ) : null}

          <div className="flex gap-2 overflow-x-auto pb-1">
            {MARKETPLACE_CATEGORY_CHIPS.map((chip) => {
              const active =
                (chip.id === "" && !category) || chip.id === category;
              return (
                <button
                  key={chip.id || "all"}
                  type="button"
                  onClick={() => setCategory(chip.id)}
                  className={cn(
                    "shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition",
                    active
                      ? "border-brand-500/50 bg-brand-500 text-zinc-950"
                      : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-brand-500/30 hover:bg-brand-500/10",
                  )}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {!city.trim() ? (
          <p className="rounded-xl border border-brand-500/20 bg-brand-500/5 px-4 py-3 text-sm text-brand-100/90">
            Dica: digite parte da cidade (ex. <strong>sao</strong> ou{" "}
            <strong>jose dos</strong>) — a lista atualiza sozinha.
          </p>
        ) : null}

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium text-zinc-200">{heading}</h2>
            {loading ? (
              <LoaderCircle
                className="size-4 animate-spin text-brand-300"
                aria-label="Atualizando resultados"
              />
            ) : null}
          </div>

          {shops.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-14 text-center">
              <p className="text-zinc-300">Nenhuma barbearia encontrada.</p>
              <p className="mt-2 text-sm text-zinc-500">
                Tente outro termo, outra cidade ou limpe os filtros.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setCity("");
                  setCategory("");
                }}
                className="mt-4 inline-block text-sm font-medium text-brand-300 hover:text-brand-200"
              >
                Limpar busca
              </button>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3 xl:grid-cols-4">
              {shops.map((shop) => (
                <MarketplaceShopCard key={shop.id} shop={shop} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

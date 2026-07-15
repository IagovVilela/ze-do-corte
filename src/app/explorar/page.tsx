import Link from "next/link";
import type { Metadata } from "next";

import { ExploreFavoritesLink } from "@/components/marketplace/explore-favorites-link";
import { ExploreSearch } from "@/components/marketplace/explore-search";
import { MarketplaceShopCard } from "@/components/marketplace/shop-card";
import { searchMarketplaceShops } from "@/lib/marketplace";
import {
  marketplaceHomePath,
  publicSurfaceUrl,
} from "@/lib/public-hosts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Encontrar barbearias | Barbernegon",
  description:
    "Busque barbearias por serviço ou cidade e entre no site da marca para agendar.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(sp: Record<string, string | string[] | undefined>, key: string) {
  const v = sp[key];
  return typeof v === "string" ? v : Array.isArray(v) ? v[0] : "";
}

export default async function ExplorarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = one(sp, "q");
  const city = one(sp, "city");
  const category = one(sp, "category");

  const shops = await searchMarketplaceShops({ q, city, category });

  const titleParts: string[] = [];
  if (q) titleParts.push(`“${q}”`);
  if (city) titleParts.push(`em ${city}`);
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
            Busque por serviço ou cidade. Informe a cidade para ver salões perto
            de você. No card: mapa, favoritar e entrar no site da marca.
          </p>
        </div>

        <ExploreSearch
          initialQ={q}
          initialCity={city}
          initialCategory={category}
        />

        {!city.trim() ? (
          <p className="rounded-xl border border-brand-500/20 bg-brand-500/5 px-4 py-3 text-sm text-brand-100/90">
            Dica: preencha a <strong>cidade</strong> na busca para filtrar
            barbearias perto de você.
          </p>
        ) : null}

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-zinc-200">{heading}</h2>

          {shops.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-14 text-center">
              <p className="text-zinc-300">Nenhuma barbearia encontrada.</p>
              <p className="mt-2 text-sm text-zinc-500">
                Tente outro termo, outra cidade ou limpe os filtros.
              </p>
              <Link
                href={marketplaceHomePath()}
                className="mt-4 inline-block text-sm font-medium text-brand-300 hover:text-brand-200"
              >
                Limpar busca
              </Link>
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

import Link from "next/link";
import type { Metadata } from "next";

import { FavoritesShopsList } from "@/components/marketplace/favorites-shops-list";
import { marketplaceHomePath } from "@/lib/public-hosts";

export const metadata: Metadata = {
  title: "Favoritos | Barbernegon",
  description: "Barbearias que você salvou neste aparelho.",
};

export default function ExplorarFavoritosPage() {
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
          <Link
            href={marketplaceHomePath()}
            className="text-sm text-zinc-400 hover:text-brand-200"
          >
            Voltar à busca
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Favoritos
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Salvos neste aparelho — não sincronizam com outra conta.
          </p>
        </div>
        <FavoritesShopsList />
      </main>
    </div>
  );
}

import type { Metadata } from "next";

import { ExploreChrome } from "@/components/marketplace/explore-chrome";
import { FavoritesShopsList } from "@/components/marketplace/favorites-shops-list";

export const metadata: Metadata = {
  title: "Favoritos | Barbernegon",
  description: "Barbearias que você salvou neste aparelho.",
};

export default function ExplorarFavoritosPage() {
  return (
    <ExploreChrome>
      <main className="mx-auto w-full max-w-[1280px] space-y-6 px-4 pt-24 pb-10 sm:px-6 sm:pt-28 sm:pb-14">
        <div>
          <span className="mb-3 block text-xs font-bold tracking-[0.2em] text-[#adc6ff] uppercase">
            Marketplace
          </span>
          <h1 className="font-explore-headline text-3xl font-bold tracking-tight text-[#e1e2ec] sm:text-4xl">
            Favoritos
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[#9CA3AF] sm:text-base">
            Salvos neste aparelho — não sincronizam com outra conta.
          </p>
        </div>
        <FavoritesShopsList />
      </main>
    </ExploreChrome>
  );
}

import type { Metadata } from "next";

import { ExploreMarketplaceClient } from "@/components/marketplace/explore-marketplace-client";
import { searchMarketplaceShops } from "@/lib/marketplace";

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

  return (
    <ExploreMarketplaceClient
      initialQ={q}
      initialCity={city}
      initialCategory={category}
      initialShops={shops}
    />
  );
}

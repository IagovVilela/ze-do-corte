import { BARBER_SHOP_ADDRESS } from "@/lib/constants";

type Props = {
  query?: string;
};

export function LocationMap({ query }: Props) {
  const address = query || BARBER_SHOP_ADDRESS;
  const encoded = encodeURIComponent(address);
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encoded}`;

  return (
    <div className="flex flex-col gap-4">
      <iframe
        title="Mapa — Zé do Corte"
        className="aspect-[16/10] min-h-[220px] w-full rounded-2xl border border-white/10 bg-zinc-900/40"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={`https://maps.google.com/maps?q=${encoded}&hl=pt&z=16&output=embed`}
      />
      <a
        href={mapsHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-fit items-center gap-2 text-sm font-medium text-brand-300 underline-offset-4 transition hover:text-brand-200 hover:underline"
      >
        Abrir no Google Maps
      </a>
    </div>
  );
}

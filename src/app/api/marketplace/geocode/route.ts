import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

/**
 * Reverse geocode (Nominatim) → cidade para o filtro do marketplace.
 * GET /api/marketplace/geocode?lat=&lon=
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    lat: searchParams.get("lat"),
    lon: searchParams.get("lon"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Coordenadas inválidas." },
      { status: 400 },
    );
  }

  const { lat, lon } = parsed.data;
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "json");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("zoom", "10");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "pt-BR");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "BarbernegonMarketplace/1.0 (marketplace city search)",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { message: "Não foi possível obter a localização." },
        { status: 502 },
      );
    }
    const data = (await res.json()) as {
      address?: Record<string, string | undefined>;
      display_name?: string;
    };
    const a = data.address ?? {};
    const city =
      a.city ||
      a.town ||
      a.village ||
      a.municipality ||
      a.county ||
      a.state_district ||
      null;

    if (!city?.trim()) {
      return NextResponse.json(
        { message: "Não encontramos uma cidade neste ponto." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      city: city.trim(),
      state: a.state ?? null,
      displayName: data.display_name ?? null,
    });
  } catch {
    return NextResponse.json(
      { message: "Erro ao consultar o mapa." },
      { status: 502 },
    );
  }
}

/**
 * Tema visual estável por barbeiro (hash do id) — cartões distintos na home sem campos extra no painel.
 */

export type BarberCardTheme = {
  /** Classes para anel / borda do cartão */
  ring: string;
  /** Gradiente no fundo da área da foto (overlay) */
  imageWash: string;
  /** Faixa inferior sobre a foto */
  imageFade: string;
  /** Destaque do nome e traço decorativo */
  accentText: string;
  /** Chip no canto da foto */
  chip: string;
  /** Traço sob o título */
  bar: string;
};

const PALETTE: BarberCardTheme[] = [
  {
    ring: "ring-amber-500/35 hover:ring-amber-400/50",
    imageWash: "from-amber-600/25 via-transparent to-transparent",
    imageFade: "from-zinc-950 via-zinc-950/70 to-transparent",
    accentText: "text-amber-200",
    chip: "bg-amber-500/15 text-amber-200/90 ring-amber-500/25",
    bar: "from-amber-400/80 to-amber-600/20",
  },
  {
    ring: "ring-cyan-500/35 hover:ring-cyan-400/50",
    imageWash: "from-cyan-600/25 via-transparent to-transparent",
    imageFade: "from-zinc-950 via-zinc-950/70 to-transparent",
    accentText: "text-cyan-200",
    chip: "bg-cyan-500/15 text-cyan-200/90 ring-cyan-500/25",
    bar: "from-cyan-400/80 to-cyan-600/20",
  },
  {
    ring: "ring-fuchsia-500/35 hover:ring-fuchsia-400/50",
    imageWash: "from-fuchsia-600/20 via-transparent to-transparent",
    imageFade: "from-zinc-950 via-zinc-950/70 to-transparent",
    accentText: "text-fuchsia-200",
    chip: "bg-fuchsia-500/15 text-fuchsia-200/90 ring-fuchsia-500/25",
    bar: "from-fuchsia-400/80 to-fuchsia-600/20",
  },
  {
    ring: "ring-emerald-500/35 hover:ring-emerald-400/50",
    imageWash: "from-emerald-600/22 via-transparent to-transparent",
    imageFade: "from-zinc-950 via-zinc-950/70 to-transparent",
    accentText: "text-emerald-200",
    chip: "bg-emerald-500/15 text-emerald-200/90 ring-emerald-500/25",
    bar: "from-emerald-400/80 to-emerald-600/20",
  },
  {
    ring: "ring-orange-500/35 hover:ring-orange-400/50",
    imageWash: "from-orange-600/22 via-transparent to-transparent",
    imageFade: "from-zinc-950 via-zinc-950/70 to-transparent",
    accentText: "text-orange-200",
    chip: "bg-orange-500/15 text-orange-200/90 ring-orange-500/25",
    bar: "from-orange-400/80 to-orange-600/20",
  },
  {
    ring: "ring-violet-500/35 hover:ring-violet-400/50",
    imageWash: "from-violet-600/22 via-transparent to-transparent",
    imageFade: "from-zinc-950 via-zinc-950/70 to-transparent",
    accentText: "text-violet-200",
    chip: "bg-violet-500/15 text-violet-200/90 ring-violet-500/25",
    bar: "from-violet-400/80 to-violet-600/20",
  },
];

function stableHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function getBarberCardTheme(barberId: string): BarberCardTheme {
  return PALETTE[stableHash(barberId) % PALETTE.length];
}

/** 0 = cartão vertical clássico; 1 = foto mais quadrada, borda acentuada; 2 = faixa lateral de cor no desktop */
export function getBarberCardLayout(barberId: string): 0 | 1 | 2 {
  return (stableHash(`${barberId}:layout`) % 3) as 0 | 1 | 2;
}

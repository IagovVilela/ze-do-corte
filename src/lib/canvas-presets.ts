import {
  type CanvasArtboardId,
  type CanvasElement,
  type CanvasTheme,
  createLibraryElement,
  elementsForArtboard,
  type SiteCanvasConfig,
} from "@/lib/site-canvas";

/** Estilo visual pronto (bakea props no elemento). */
export type StylePreset = {
  id: string;
  label: string;
  hint: string;
  props: Record<string, unknown>;
  /** Ajuste opcional de frame (ex.: botão mais largo). */
  frame?: Partial<{ w: number; h: number }>;
};

export const BUTTON_STYLE_PRESETS: StylePreset[] = [
  {
    id: "solid",
    label: "Sólido",
    hint: "Preenchido (marca)",
    props: {
      variant: "solid",
      backgroundColor: "#3b82f6",
      color: "#09090b",
      borderColor: "transparent",
      borderWidth: 0,
      borderRadius: 999,
      fontWeight: 700,
    },
  },
  {
    id: "outline",
    label: "Contorno",
    hint: "Borda clara",
    props: {
      variant: "outline",
      backgroundColor: "transparent",
      color: "#fafafa",
      borderColor: "#fafafa",
      borderWidth: 2,
      borderRadius: 999,
      fontWeight: 700,
    },
  },
  {
    id: "ghost",
    label: "Fantasma",
    hint: "Só texto",
    props: {
      variant: "ghost",
      backgroundColor: "transparent",
      color: "#3b82f6",
      borderColor: "transparent",
      borderWidth: 0,
      borderRadius: 8,
      fontWeight: 700,
    },
  },
  {
    id: "soft",
    label: "Suave",
    hint: "Fundo brand suave",
    props: {
      variant: "soft",
      backgroundColor: "#3b82f633",
      color: "#8eb6ff",
      borderColor: "#3b82f666",
      borderWidth: 1,
      borderRadius: 999,
      fontWeight: 700,
    },
  },
  {
    id: "square",
    label: "Quadrado",
    hint: "Cantos retos",
    props: {
      variant: "square",
      backgroundColor: "#3b82f6",
      color: "#09090b",
      borderColor: "transparent",
      borderWidth: 0,
      borderRadius: 8,
      fontWeight: 700,
    },
  },
  {
    id: "inverted",
    label: "Invertido",
    hint: "Claro sobre marca",
    props: {
      variant: "inverted",
      backgroundColor: "#fafafa",
      color: "#0f1419",
      borderColor: "transparent",
      borderWidth: 0,
      borderRadius: 999,
      fontWeight: 700,
    },
  },
];

export const BADGE_STYLE_PRESETS: StylePreset[] = [
  {
    id: "pill-brand",
    label: "Pílula",
    hint: "Marca",
    props: {
      variant: "pill-brand",
      backgroundColor: "#3b82f6",
      color: "#09090b",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
    },
  },
  {
    id: "outline",
    label: "Contorno",
    hint: "Borda fina",
    props: {
      variant: "outline",
      backgroundColor: "transparent",
      color: "#8eb6ff",
      borderColor: "#3b82f6",
      borderWidth: 1,
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
    },
  },
  {
    id: "soft",
    label: "Suave",
    hint: "Fundo discreto",
    props: {
      variant: "soft",
      backgroundColor: "#ffffff14",
      color: "#fafafa",
      borderColor: "#ffffff22",
      borderWidth: 1,
      borderRadius: 8,
      fontSize: 12,
      fontWeight: 600,
    },
  },
  {
    id: "alert",
    label: "Alerta",
    hint: "Destaque quente",
    props: {
      variant: "alert",
      backgroundColor: "#b45309",
      color: "#fff7ed",
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 700,
    },
  },
];

export const PANEL_STYLE_PRESETS: StylePreset[] = [
  {
    id: "card",
    label: "Card",
    hint: "Superfície com borda",
    props: {
      variant: "card",
      backgroundColor: "#18181b",
      borderColor: "#3f3f46",
      borderRadius: 20,
      padding: 24,
      color: "#fafafa",
      title: "Título do card",
      description: "Texto de apoio do bloco.",
    },
  },
  {
    id: "glass",
    label: "Vidro",
    hint: "Translúcido",
    props: {
      variant: "glass",
      backgroundColor: "#ffffff12",
      borderColor: "#ffffff22",
      borderRadius: 24,
      padding: 28,
      color: "#fafafa",
      title: "Destaque",
      description: "Bloco suave sobre o fundo.",
    },
  },
  {
    id: "accent",
    label: "Acento",
    hint: "Barra brand",
    props: {
      variant: "accent",
      backgroundColor: "#1c1917",
      borderColor: "#3b82f6",
      borderRadius: 16,
      padding: 24,
      color: "#fafafa",
      thickness: 3,
      title: "Destaque",
      description: "Com barra na cor principal.",
    },
  },
  {
    id: "flat",
    label: "Flat",
    hint: "Sem borda",
    props: {
      variant: "flat",
      backgroundColor: "#27272a",
      borderColor: "transparent",
      borderRadius: 16,
      padding: 20,
      color: "#fafafa",
      title: "Bloco",
      description: "Fundo sólido, limpo.",
    },
  },
  {
    id: "daypart",
    label: "Horário",
    hint: "Tipo manhã / tarde / noite",
    props: {
      variant: "card",
      backgroundColor: "theme.surface",
      borderColor: "transparent",
      borderRadius: 20,
      padding: 22,
      color: "theme.text",
      title: "Manhã",
      description: "Luz natural e café. Ideal pra fade.",
    },
    frame: { w: 400, h: 140 },
  },
];

export const RECT_STYLE_PRESETS: StylePreset[] = [
  {
    id: "band",
    label: "Faixa sólida",
    hint: "Bloco de cor largo (como na imagem)",
    props: {
      backgroundColor: "theme.primary",
      borderColor: "transparent",
      borderRadius: 0,
    },
    frame: { h: 260 },
  },
  {
    id: "rounded-band",
    label: "Faixa arredondada",
    hint: "Bloco brand com cantos",
    props: {
      backgroundColor: "theme.primary",
      borderColor: "transparent",
      borderRadius: 24,
    },
    frame: { h: 200 },
  },
  {
    id: "surface-slab",
    label: "Placa superfície",
    hint: "Fundo suave para apoio",
    props: {
      backgroundColor: "theme.surface",
      borderColor: "transparent",
      borderRadius: 20,
    },
    frame: { h: 220 },
  },
  {
    id: "card-shape",
    label: "Retângulo card",
    hint: "Forma menor com borda",
    props: {
      backgroundColor: "theme.surface",
      borderColor: "#ffffff22",
      borderRadius: 16,
    },
    frame: { w: 360, h: 160 },
  },
];

export const TEXT_STYLE_PRESETS: StylePreset[] = [
  {
    id: "display",
    label: "Display",
    hint: "Título grande",
    props: {
      variant: "display",
      fontSize: 56,
      fontWeight: 700,
      color: "#fafafa",
      align: "left",
    },
    frame: { h: 80 },
  },
  {
    id: "title",
    label: "Título",
    hint: "Seção",
    props: {
      variant: "title",
      fontSize: 32,
      fontWeight: 600,
      color: "#fafafa",
      align: "left",
    },
    frame: { h: 48 },
  },
  {
    id: "body",
    label: "Corpo",
    hint: "Parágrafo",
    props: {
      variant: "body",
      fontSize: 16,
      fontWeight: 400,
      color: "#a1a1aa",
      align: "left",
    },
    frame: { h: 72 },
  },
  {
    id: "caption",
    label: "Legenda",
    hint: "Pequeno",
    props: {
      variant: "caption",
      fontSize: 12,
      fontWeight: 400,
      color: "#71717a",
      align: "left",
    },
    frame: { h: 32 },
  },
  {
    id: "eyebrow",
    label: "Eyebrow",
    hint: "Caixa alta",
    props: {
      variant: "eyebrow",
      text: "DESTAQUE",
      fontSize: 12,
      fontWeight: 700,
      color: "#3b82f6",
      align: "left",
    },
    frame: { h: 28 },
  },
];

export const HERO_STYLE_PRESETS: StylePreset[] = [
  {
    id: "cinematic",
    label: "Cinema",
    hint: "Escuro + overlay forte",
    props: {
      variant: "cinematic",
      backgroundColor: "#0f1419",
      overlay: 0.55,
      color: "#fafafa",
      ctaLabel: "Agendar",
    },
  },
  {
    id: "light",
    label: "Claro",
    hint: "Fundo suave",
    props: {
      variant: "light",
      backgroundColor: "#f5f0e8",
      overlay: 0.15,
      color: "#1c1917",
      ctaLabel: "Agendar",
    },
  },
  {
    id: "brand",
    label: "Marca",
    hint: "Tom de marca",
    props: {
      variant: "brand",
      backgroundColor: "#2a2118",
      overlay: 0.35,
      color: "#fafafa",
      ctaLabel: "Quero agendar",
    },
  },
];

export type TypographyPreset = {
  id: string;
  label: string;
  hint: string;
  theme: Pick<CanvasTheme, "fontDisplay" | "fontBody">;
};

/** Stacks que usam fonts já carregadas no app + fallbacks do sistema. */
export const TYPOGRAPHY_PRESETS: TypographyPreset[] = [
  {
    id: "barber-classic",
    label: "Clássico barbearia",
    hint: "Display Bebas + corpo Geist",
    theme: {
      fontDisplay: "inherit",
      fontBody: "var(--font-geist-sans), system-ui, sans-serif",
    },
  },
  {
    id: "moderno",
    label: "Moderno",
    hint: "Sans limpo nos dois",
    theme: {
      fontDisplay: "var(--font-geist-sans), system-ui, sans-serif",
      fontBody: "var(--font-geist-sans), system-ui, sans-serif",
    },
  },
  {
    id: "editorial",
    label: "Editorial",
    hint: "Serif no título",
    theme: {
      fontDisplay: 'Georgia, "Times New Roman", Times, serif',
      fontBody: "var(--font-geist-sans), system-ui, sans-serif",
    },
  },
  {
    id: "tecnico",
    label: "Técnico",
    hint: "Mono no display",
    theme: {
      fontDisplay: "var(--font-geist-mono), ui-monospace, monospace",
      fontBody: "var(--font-geist-sans), system-ui, sans-serif",
    },
  },
  {
    id: "suave",
    label: "Suave",
    hint: "UI arredondada",
    theme: {
      fontDisplay:
        'ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", system-ui, sans-serif',
      fontBody: "var(--font-geist-sans), system-ui, sans-serif",
    },
  },
];

export type PremadeSectionId =
  | "hero-diffs"
  | "cta-band"
  | "services-block"
  | "social-proof"
  | "intro-stack"
  | "contact-footer"
  | "color-band"
  | "dayparts";

export type PremadeSectionDef = {
  id: PremadeSectionId;
  label: string;
  hint: string;
};

export const PREMADE_SECTIONS: PremadeSectionDef[] = [
  {
    id: "color-band",
    label: "Faixa de cor",
    hint: "Bloco sólido full-width (tipo marca)",
  },
  {
    id: "dayparts",
    label: "Manhã · Tarde · Noite",
    hint: "3 cards de período lado a lado",
  },
  {
    id: "hero-diffs",
    label: "Hero + 3 diferenciais",
    hint: "Abertura + grid de cartões",
  },
  {
    id: "cta-band",
    label: "Faixa de CTA",
    hint: "Painel + botão agendar",
  },
  {
    id: "services-block",
    label: "Bloco serviços",
    hint: "Título + catálogo",
  },
  {
    id: "social-proof",
    label: "Prova social",
    hint: "Badge + 3 painéis",
  },
  {
    id: "intro-stack",
    label: "Intro com CTA",
    hint: "Eyebrow + título + botão",
  },
  {
    id: "contact-footer",
    label: "Contato + rodapé",
    hint: "Fechamento da página",
  },
];

export function nextArtboardY(
  canvas: SiteCanvasConfig,
  artboard: CanvasArtboardId,
  gap = 32,
): number {
  const els = elementsForArtboard(canvas, artboard);
  if (!els.length) return artboard === "mobile" ? 72 : 80;
  return Math.max(...els.map((e) => e.frame.y + e.frame.h)) + gap;
}

function stampId(prefix: string, i: number) {
  return `${prefix}-${Date.now().toString(36)}-${i}`;
}

function place(
  type: CanvasElement["type"],
  artboard: CanvasArtboardId,
  boardW: number,
  frame: CanvasElement["frame"],
  props: Record<string, unknown>,
  zIndex: number,
  idSuffix: number,
): CanvasElement {
  const base = createLibraryElement(type, artboard, boardW, frame.y);
  return {
    ...base,
    id: stampId(type, idSuffix),
    frame,
    zIndex,
    props: { ...base.props, ...props },
  };
}

export function createPremadeSection(
  id: PremadeSectionId,
  artboard: CanvasArtboardId,
  boardW: number,
  atY: number,
): CanvasElement[] {
  const pad = artboard === "mobile" ? 16 : 48;
  const fullW = boardW - pad * 2;
  const mobile = artboard === "mobile";
  const out: CanvasElement[] = [];
  let y = atY;
  let i = 0;

  switch (id) {
    case "hero-diffs": {
      const heroH = mobile ? 420 : 520;
      out.push(
        place(
          "hero",
          artboard,
          boardW,
          { x: 0, y, w: boardW, h: heroH },
          {
            eyebrow: "Bem-vindo",
            title: "Corte com identidade",
            description: "Agenda online, equipe e a cara da sua marca.",
            ctaLabel: "Agendar agora",
            href: "book",
            overlay: 0.5,
            variant: "cinematic",
          },
          10,
          i++,
        ),
      );
      y += heroH + 40;
      out.push(
        place(
          "grid",
          artboard,
          boardW,
          { x: pad, y, w: fullW, h: mobile ? 560 : 280 },
          {
            title: "Por que escolher a gente",
            gridCols: mobile ? 1 : 3,
            cards: [
              {
                title: "Agenda fácil",
                description: "Cliente marca dia e hora no site.",
                emoji: "⏱",
              },
              {
                title: "Profissionais",
                description: "Equipe em destaque com estilo.",
                emoji: "✂",
              },
              {
                title: "Sua marca",
                description: "Cores e layout sob o seu controle.",
                emoji: "✦",
              },
            ],
          },
          20,
          i++,
        ),
      );
      break;
    }
    case "cta-band": {
      const bandH = mobile ? 200 : 160;
      out.push(
        place(
          "panel",
          artboard,
          boardW,
          { x: pad, y, w: fullW, h: bandH },
          {
            title: "Pronto para renovar o visual?",
            description: "Reserve em poucos toques — sem ligação.",
            variant: "accent",
            backgroundColor: "#1c1917",
            borderColor: "#3b82f6",
            padding: 28,
          },
          10,
          i++,
        ),
      );
      out.push(
        place(
          "button",
          artboard,
          boardW,
          {
            x: mobile ? pad + 16 : pad + fullW - 200,
            y: y + (mobile ? bandH - 64 : 56),
            w: mobile ? fullW - 32 : 180,
            h: 48,
          },
          {
            text: "Agendar",
            href: "book",
            variant: "solid",
            backgroundColor: "#3b82f6",
            color: "#09090b",
            borderRadius: 999,
          },
          30,
          i++,
        ),
      );
      break;
    }
    case "services-block": {
      out.push(
        place(
          "text",
          artboard,
          boardW,
          { x: pad, y, w: fullW, h: 48 },
          {
            text: "Serviços",
            variant: "title",
            fontSize: mobile ? 28 : 36,
            fontWeight: 700,
            color: "#fafafa",
          },
          10,
          i++,
        ),
      );
      y += 56;
      out.push(
        place(
          "services",
          artboard,
          boardW,
          { x: pad, y, w: fullW, h: mobile ? 520 : 380 },
          { title: "", gridCols: mobile ? 1 : 3 },
          20,
          i++,
        ),
      );
      break;
    }
    case "social-proof": {
      out.push(
        place(
          "badge",
          artboard,
          boardW,
          { x: pad, y, w: 140, h: 32 },
          {
            text: "Clientes",
            variant: "pill-brand",
            backgroundColor: "#3b82f6",
            color: "#09090b",
          },
          10,
          i++,
        ),
      );
      y += 48;
      out.push(
        place(
          "text",
          artboard,
          boardW,
          { x: pad, y, w: fullW, h: 44 },
          {
            text: "O que dizem por aqui",
            variant: "title",
            fontSize: mobile ? 26 : 32,
            fontWeight: 600,
          },
          15,
          i++,
        ),
      );
      y += 56;
      const colW = mobile ? fullW : Math.floor((fullW - 32) / 3);
      const quotes = [
        { title: "Pontualidade", description: "Cheguei e fui atendido na hora." },
        { title: "Acabamento", description: "Corte alinhado ao que pedi." },
        { title: "Ambiente", description: "Lugar limpo e profissional." },
      ];
      quotes.forEach((q, qi) => {
        const x = mobile ? pad : pad + qi * (colW + 16);
        const py = mobile ? y + qi * 140 : y;
        out.push(
          place(
            "panel",
            artboard,
            boardW,
            { x, y: py, w: colW, h: 120 },
            {
              ...q,
              variant: "glass",
              backgroundColor: "#ffffff10",
              borderColor: "#ffffff18",
              borderRadius: 16,
              padding: 16,
            },
            20 + qi,
            i++,
          ),
        );
      });
      break;
    }
    case "intro-stack": {
      out.push(
        place(
          "text",
          artboard,
          boardW,
          { x: pad, y, w: fullW, h: 28 },
          {
            text: "SUA BARBEARIA",
            variant: "eyebrow",
            fontSize: 12,
            fontWeight: 700,
            color: "#3b82f6",
          },
          10,
          i++,
        ),
      );
      y += 36;
      out.push(
        place(
          "text",
          artboard,
          boardW,
          { x: pad, y, w: Math.min(fullW, mobile ? fullW : 720), h: mobile ? 100 : 120 },
          {
            text: "Estilo que\ncombina com você",
            variant: "display",
            fontSize: mobile ? 36 : 52,
            fontWeight: 700,
            color: "#fafafa",
          },
          15,
          i++,
        ),
      );
      y += mobile ? 116 : 136;
      out.push(
        place(
          "text",
          artboard,
          boardW,
          { x: pad, y, w: Math.min(fullW, 480), h: 56 },
          {
            text: "Agende online e escolha o profissional que combina com o seu visual.",
            variant: "body",
            fontSize: 16,
            fontWeight: 400,
            color: "#a1a1aa",
          },
          16,
          i++,
        ),
      );
      y += 72;
      out.push(
        place(
          "button",
          artboard,
          boardW,
          { x: pad, y, w: 200, h: 52 },
          {
            text: "Agendar horário",
            href: "book",
            variant: "solid",
            backgroundColor: "#3b82f6",
            color: "#09090b",
            borderRadius: 999,
            fontWeight: 700,
          },
          30,
          i++,
        ),
      );
      break;
    }
    case "contact-footer": {
      out.push(
        place(
          "contact",
          artboard,
          boardW,
          { x: pad, y, w: fullW, h: mobile ? 360 : 320 },
          { title: "Contato e unidades" },
          10,
          i++,
        ),
      );
      y += mobile ? 380 : 340;
      out.push(
        place(
          "footer",
          artboard,
          boardW,
          { x: 0, y, w: boardW, h: 100 },
          { showPitch: true },
          5,
          i++,
        ),
      );
      break;
    }
    case "color-band": {
      out.push(
        place(
          "rect",
          artboard,
          boardW,
          { x: 0, y, w: boardW, h: mobile ? 200 : 280 },
          {
            backgroundColor: "theme.primary",
            borderColor: "transparent",
            borderRadius: 0,
          },
          2,
          i++,
        ),
      );
      break;
    }
    case "dayparts": {
      const gap = mobile ? 12 : 20;
      const cardW = mobile
        ? fullW
        : Math.floor((fullW - gap * 2) / 3);
      const cardH = mobile ? 120 : 140;
      const parts = [
        {
          title: "Manhã",
          description: "Luz natural e café. Ideal pra fade.",
        },
        {
          title: "Tarde",
          description: "Fluxo contínuo. Encaixe rápido.",
        },
        {
          title: "Noite",
          description: "Ambiente fechado, acabamento fino.",
        },
      ] as const;
      parts.forEach((part, idx) => {
        const x = mobile ? pad : pad + idx * (cardW + gap);
        const cy = mobile ? y + idx * (cardH + gap) : y;
        out.push(
          place(
            "panel",
            artboard,
            boardW,
            { x, y: cy, w: cardW, h: cardH },
            {
              title: part.title,
              description: part.description,
              variant: "card",
              backgroundColor: "theme.surface",
              borderColor: "transparent",
              borderRadius: 20,
              padding: 22,
              color: "theme.text",
            },
            10,
            i++,
          ),
        );
      });
      break;
    }
    default: {
      const _e: never = id;
      void _e;
      break;
    }
  }

  return out;
}

export function applyStylePreset(
  element: CanvasElement,
  preset: StylePreset,
): CanvasElement {
  return {
    ...element,
    frame: {
      ...element.frame,
      ...(preset.frame?.w ? { w: preset.frame.w } : {}),
      ...(preset.frame?.h ? { h: preset.frame.h } : {}),
    },
    props: {
      ...element.props,
      ...preset.props,
    },
  };
}

export function stylePresetsForType(
  type: CanvasElement["type"],
): StylePreset[] {
  switch (type) {
    case "button":
      return BUTTON_STYLE_PRESETS;
    case "badge":
      return BADGE_STYLE_PRESETS;
    case "panel":
      return PANEL_STYLE_PRESETS;
    case "text":
      return TEXT_STYLE_PRESETS;
    case "hero":
      return HERO_STYLE_PRESETS;
    case "rect":
      return RECT_STYLE_PRESETS;
    default:
      return [];
  }
}

/** Biblioteca rápida: elementos já com estilo aplicado. */
export function createStyledLibraryElement(
  type: "button" | "badge" | "text" | "panel" | "hero" | "rect",
  presetId: string,
  artboard: CanvasArtboardId,
  boardW: number,
  atY: number,
): CanvasElement | null {
  const presets = stylePresetsForType(type);
  const preset = presets.find((p) => p.id === presetId);
  if (!preset) return null;
  const el = createLibraryElement(type, artboard, boardW, atY);
  const next = applyStylePreset(el, preset);
  // Faixas full-width: ocupar a largura do artboard.
  if (type === "rect" && (presetId === "band" || presetId === "rounded-band")) {
    return {
      ...next,
      frame: {
        ...next.frame,
        x: 0,
        w: boardW,
        h: preset.frame?.h ?? next.frame.h,
      },
    };
  }
  if (type === "rect" && presetId === "surface-slab") {
    const pad = artboard === "mobile" ? 16 : 48;
    return {
      ...next,
      frame: {
        ...next.frame,
        x: pad,
        w: boardW - pad * 2,
        h: preset.frame?.h ?? next.frame.h,
      },
    };
  }
  return next;
}

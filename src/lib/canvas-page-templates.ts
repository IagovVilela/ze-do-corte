import type {
  CanvasArtboardId,
  CanvasElement,
  CanvasElementType,
  CanvasTheme,
  SiteCanvasConfig,
} from "@/lib/site-canvas";

const DESK_W = 1440;
const MOB_W = 390;

export const CANVAS_PAGE_TEMPLATE_IDS = [
  "blank",
  "classic",
  "studio",
  "minimal",
  "moderno",
  "editorial",
  "impacto",
  "noir",
  "neon",
  "brutalista",
  "ocean",
  "boutique",
  "bauhaus",
  "rua",
  "vitrine",
] as const;

export type CanvasPageTemplateId = (typeof CANVAS_PAGE_TEMPLATE_IDS)[number];

/** @deprecated alias — prefer CanvasPageTemplateId */
export type CanvasTemplateId = CanvasPageTemplateId;

export type PageTemplateMeta = {
  id: CanvasPageTemplateId;
  label: string;
  tagline: string;
  vibe: string;
  swatch: string;
  layoutHint: string;
};

export const PAGE_TEMPLATE_META: PageTemplateMeta[] = [
  {
    id: "blank",
    label: "Em branco",
    tagline: "Canvas quase vazio com área livre marcada.",
    vibe: "Começar do zero",
    swatch: "#3f3f46",
    layoutHint: "Navbar · caixa vazia · rodapé",
  },
  {
    id: "classic",
    label: "Clássico",
    tagline: "Ornamento centrado: regras douradas e dois painéis espelhados.",
    vibe: "Barbearia tradicional",
    swatch: "#d4a574",
    layoutHint: "Centro · regras · 2 painéis simétricos",
  },
  {
    id: "studio",
    label: "Estúdio",
    tagline: "70/30 foto à esquerda + texto; galeria de 3 mídias.",
    vibe: "Visual / foto",
    swatch: "#c084fc",
    layoutHint: "Mídia 70% | texto · strip 3 fotos",
  },
  {
    id: "minimal",
    label: "Minimalista",
    tagline: "Coluna única estreita (~640px), muito espaço, CTA contorno.",
    vibe: "Leve / clean",
    swatch: "#e4e4e7",
    layoutHint: "Coluna 640 centrada · outline CTA",
  },
  {
    id: "moderno",
    label: "Moderno",
    tagline: "Split vertical 50/50 na primeira dobra + grid geométrico.",
    vibe: "Geométrico",
    swatch: "#22d3ee",
    layoutHint: "Split 50|50 · grid 3 abaixo",
  },
  {
    id: "editorial",
    label: "Editorial",
    tagline: "Magazine creme: headline + coluna preta + pull-quote.",
    vibe: "Revista",
    swatch: "#f5f0e8",
    layoutHint: "Headline · spine preta · citação",
  },
  {
    id: "impacto",
    label: "Impacto",
    tagline: "Hero full-bleed + tipografia gigante + 3 blocos numerados.",
    vibe: "Ousado",
    swatch: "#fb923c",
    layoutHint: "Hero full · faixa · 01 02 03",
  },
  {
    id: "noir",
    label: "Noir",
    tagline: "Sidebar dourada ~280px + conteúdo deslocado à direita.",
    vibe: "Premium night",
    swatch: "#d4af37",
    layoutHint: "Sidebar 280 · conteúdo offset",
  },
  {
    id: "neon",
    label: "Neon",
    tagline: "Barras verticais neon + ticker + tipografia mono + lista densa.",
    vibe: "Noturno / tech",
    swatch: "#a3e635",
    layoutHint: "Barras verticais · ticker · lista 1",
  },
  {
    id: "brutalista",
    label: "Brutalista",
    tagline: "Tabela com bordas 4px, carimbo sobreposto, zero radius.",
    vibe: "Industrial",
    swatch: "#a3a3a3",
    layoutHint: "Grade bordada · carimbo · células",
  },
  {
    id: "ocean",
    label: "Oceano",
    tagline: "Faixas horizontais em maré + painéis glass desalinhados.",
    vibe: "Sereno",
    swatch: "#38bdf8",
    layoutHint: "Faixas maré · glass offset Y",
  },
  {
    id: "boutique",
    label: "Boutique",
    tagline: "Ritual centrado sem menu no hero; painéis muito arredondados.",
    vibe: "Sofisticado",
    swatch: "#e11d48",
    layoutHint: "Centro ritual · painéis soft · carta",
  },
  {
    id: "bauhaus",
    label: "Bauhaus",
    tagline: "3 formas primárias no primeiro viewport; faixas de princípios.",
    vibe: "Arte / design",
    swatch: "#ef4444",
    layoutHint: "Formas ■●■ · faixas cor",
  },
  {
    id: "rua",
    label: "Rua",
    tagline: "Mapa/contato à esquerda primeiro; nome e CTA à direita.",
    vibe: "Bairro / local",
    swatch: "#84cc16",
    layoutHint: "Contato|CTA split · serviços depois",
  },
  {
    id: "vitrine",
    label: "Vitrine",
    tagline: "Showcase com foto full, split editorial e prova do editor visual.",
    vibe: "Demo / identidade",
    swatch: "#3b82f6",
    layoutHint: "Foto 60% · copy · galeria · builder · serviços",
  },
];

function el(
  partial: Omit<CanvasElement, "zIndex"> & { zIndex?: number },
): CanvasElement {
  return { zIndex: 1, ...partial };
}

type FreeItem = {
  type: CanvasElementType;
  frame: CanvasElement["frame"];
  props?: CanvasElement["props"];
  zIndex?: number;
};

function free(
  artboard: CanvasArtboardId,
  prefix: string,
  items: FreeItem[],
): CanvasElement[] {
  return items.map((item, i) =>
    el({
      id: `${prefix}-${artboard}-${item.type}-${i}`,
      type: item.type,
      artboard,
      frame: item.frame,
      zIndex: item.zIndex ?? i + 1,
      props: item.props,
    }),
  );
}

function board(
  theme: CanvasTheme,
  deskH: number,
  mobH: number,
  elements: CanvasElement[],
): SiteCanvasConfig {
  return {
    version: 2,
    theme,
    artboards: {
      desktop: { width: DESK_W, height: deskH },
      mobile: { width: MOB_W, height: mobH },
    },
    elements,
  };
}

function blankTemplate(name: string): SiteCanvasConfig {
  const theme: CanvasTheme = {
    primary: "#71717a",
    secondary: "#52525b",
    background: "#09090b",
    surface: "#18181b",
    text: "#fafafa",
    fontDisplay: "var(--font-geist-sans), system-ui, sans-serif",
    fontBody: "var(--font-geist-sans), system-ui, sans-serif",
    radius: "sm",
    motion: "off",
  };
  const desk = free("desktop", "blank", [
    { type: "navbar", frame: { x: 0, y: 0, w: 1440, h: 56 }, zIndex: 20 },
    {
      type: "text",
      frame: { x: 64, y: 120, w: 600, h: 48 },
      props: {
        text: name,
        fontSize: 28,
        fontWeight: 600,
        color: "#fafafa",
        variant: "title",
      },
    },
    {
      type: "badge",
      frame: { x: 64, y: 180, w: 160, h: 28 },
      props: {
        text: "EM BRANCO",
        backgroundColor: "#27272a",
        color: "#a1a1aa",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
      },
    },
    {
      type: "rect",
      frame: { x: 64, y: 240, w: 1312, h: 520 },
      props: {
        backgroundColor: "#121214",
        borderColor: "#3f3f46",
        borderRadius: 8,
      },
    },
    {
      type: "text",
      frame: { x: 120, y: 440, w: 1200, h: 80 },
      props: {
        text: "Área livre — use a biblioteca ou um modelo completo.",
        fontSize: 22,
        color: "#52525b",
        align: "center",
        variant: "body",
      },
      zIndex: 5,
    },
    {
      type: "footer",
      frame: { x: 0, y: 820, w: 1440, h: 80 },
      props: { showPitch: false },
    },
  ]);
  const mob = free("mobile", "blank", [
    { type: "navbar", frame: { x: 0, y: 0, w: 390, h: 52 }, zIndex: 20 },
    {
      type: "text",
      frame: { x: 20, y: 80, w: 350, h: 40 },
      props: { text: name, fontSize: 22, fontWeight: 600, color: "#fafafa" },
    },
    {
      type: "rect",
      frame: { x: 20, y: 140, w: 350, h: 320 },
      props: {
        backgroundColor: "#121214",
        borderColor: "#3f3f46",
        borderRadius: 8,
      },
    },
    {
      type: "text",
      frame: { x: 40, y: 260, w: 310, h: 80 },
      props: {
        text: "Área livre para montar.",
        fontSize: 16,
        color: "#52525b",
        align: "center",
      },
      zIndex: 5,
    },
    {
      type: "footer",
      frame: { x: 0, y: 500, w: 390, h: 70 },
      props: { showPitch: false },
    },
  ]);
  return board(theme, 960, 620, [...desk, ...mob]);
}

/** Centro simétrico + regras douradas + 2 painéis espelhados. */
function classicTemplate(name: string): SiteCanvasConfig {
  const theme: CanvasTheme = {
    primary: "#d4a574",
    secondary: "#a89070",
    background: "#1a140f",
    surface: "#241c16",
    text: "#faf6f1",
    fontDisplay: 'Georgia, "Times New Roman", serif',
    fontBody: "var(--font-geist-sans), system-ui, sans-serif",
    radius: "md",
    motion: "subtle",
  };
  const desk = free("desktop", "classic", [
    {
      type: "rect",
      frame: { x: 0, y: 0, w: 1440, h: 8 },
      props: { backgroundColor: "#d4a574", borderRadius: 0 },
    },
    { type: "navbar", frame: { x: 0, y: 8, w: 1440, h: 64 }, zIndex: 40 },
    {
      type: "divider",
      frame: { x: 420, y: 140, w: 600, h: 2 },
      props: { color: "#d4a574", thickness: 2 },
    },
    {
      type: "text",
      frame: { x: 220, y: 170, w: 1000, h: 90 },
      props: {
        text: name,
        variant: "display",
        fontSize: 56,
        fontWeight: 400,
        color: "#faf6f1",
        align: "center",
      },
    },
    {
      type: "divider",
      frame: { x: 420, y: 280, w: 600, h: 2 },
      props: { color: "#d4a574", thickness: 2 },
    },
    {
      type: "text",
      frame: { x: 360, y: 310, w: 720, h: 48 },
      props: {
        text: "Tradição, precisão e o ritual do corte bem feito.",
        fontSize: 18,
        color: "#c4b5a0",
        align: "center",
      },
    },
    {
      type: "button",
      frame: { x: 580, y: 380, w: 280, h: 52 },
      props: {
        text: "Reservar horário",
        href: "book",
        backgroundColor: "#d4a574",
        color: "#1a140f",
        borderRadius: 4,
        fontWeight: 700,
      },
    },
    {
      type: "panel",
      frame: { x: 120, y: 500, w: 560, h: 220 },
      props: {
        title: "Corte clássico",
        description: "Tesoura, navalha e acabamento impecável.",
        variant: "card",
        backgroundColor: "#241c16",
        borderColor: "#d4a57466",
        borderRadius: 8,
        padding: 32,
        color: "#faf6f1",
      },
    },
    {
      type: "panel",
      frame: { x: 760, y: 500, w: 560, h: 220 },
      props: {
        title: "Barba completa",
        description: "Toalha quente, óleo e alinhamento preciso.",
        variant: "card",
        backgroundColor: "#241c16",
        borderColor: "#d4a57466",
        borderRadius: 8,
        padding: 32,
        color: "#faf6f1",
      },
    },
    {
      type: "services",
      frame: { x: 120, y: 780, w: 1200, h: 380 },
      props: { title: "Carta de serviços", gridCols: 3 },
    },
    {
      type: "team",
      frame: { x: 120, y: 1200, w: 1200, h: 320 },
      props: { title: "Nossos mestres", gridCols: 3 },
    },
    {
      type: "footer",
      frame: { x: 0, y: 1580, w: 1440, h: 100 },
      props: { showPitch: true },
    },
  ]);
  const mob = free("mobile", "classic", [
    { type: "navbar", frame: { x: 0, y: 0, w: 390, h: 52 }, zIndex: 40 },
    {
      type: "text",
      frame: { x: 24, y: 80, w: 342, h: 70 },
      props: {
        text: name,
        fontSize: 32,
        fontWeight: 400,
        color: "#faf6f1",
        align: "center",
      },
    },
    {
      type: "button",
      frame: { x: 55, y: 180, w: 280, h: 48 },
      props: {
        text: "Reservar",
        href: "book",
        backgroundColor: "#d4a574",
        color: "#1a140f",
        borderRadius: 4,
        fontWeight: 700,
      },
    },
    {
      type: "panel",
      frame: { x: 20, y: 260, w: 350, h: 140 },
      props: {
        title: "Corte clássico",
        description: "Tesoura e navalha.",
        backgroundColor: "#241c16",
        borderColor: "#d4a57466",
        borderRadius: 8,
        padding: 20,
        color: "#faf6f1",
      },
    },
    {
      type: "panel",
      frame: { x: 20, y: 420, w: 350, h: 140 },
      props: {
        title: "Barba completa",
        description: "Ritual completo.",
        backgroundColor: "#241c16",
        borderColor: "#d4a57466",
        borderRadius: 8,
        padding: 20,
        color: "#faf6f1",
      },
    },
    {
      type: "services",
      frame: { x: 16, y: 590, w: 358, h: 480 },
      props: { title: "Serviços", gridCols: 1 },
    },
    {
      type: "footer",
      frame: { x: 0, y: 1120, w: 390, h: 80 },
      props: { showPitch: true },
    },
  ]);
  return board(theme, 1740, 1260, [...desk, ...mob]);
}

/** 70/30 mídia | texto + galeria horizontal de 3. */
function studioTemplate(name: string): SiteCanvasConfig {
  const theme: CanvasTheme = {
    primary: "#c084fc",
    secondary: "#a78bfa",
    background: "#0f0a14",
    surface: "#1a1224",
    text: "#f5f3ff",
    fontDisplay: "var(--font-geist-sans), system-ui, sans-serif",
    fontBody: "var(--font-geist-sans), system-ui, sans-serif",
    radius: "lg",
    motion: "full",
  };
  /* Grade 8px: pad 48 · hero 1008/432 · galeria 3×416 gap 48 · conteúdo 1344 */
  const PAD = 48;
  const HERO_H = 624;
  const GALLERY_Y = 56 + HERO_H + PAD; // 728
  const TILE_W = 416;
  const TILE_GAP = 48;
  const TILE_H = 240;
  const CONTENT_W = DESK_W - PAD * 2; // 1344
  const TEAM_Y = GALLERY_Y + TILE_H + PAD; // 1016
  const TEAM_H = 320;
  const SERVICES_Y = TEAM_Y + TEAM_H + PAD; // 1384
  const SERVICES_H = 360;
  const FOOTER_Y = SERVICES_Y + SERVICES_H + PAD; // 1792
  const FOOTER_H = 96;
  const PANEL_X = 1008 + 40; // 1048
  const PANEL_INNER_W = 352;

  const desk = free("desktop", "studio", [
    { type: "navbar", frame: { x: 0, y: 0, w: DESK_W, h: 56 }, zIndex: 40 },
    {
      type: "media",
      frame: { x: 0, y: 56, w: 1008, h: HERO_H },
      props: { backgroundColor: "#2e1065", borderRadius: 0 },
      zIndex: 2,
    },
    {
      type: "rect",
      frame: { x: 1008, y: 56, w: 432, h: HERO_H },
      props: { backgroundColor: "#1a1224", borderRadius: 0 },
      zIndex: 1,
    },
    {
      type: "badge",
      frame: { x: PANEL_X, y: 120, w: 120, h: 32 },
      props: {
        text: "STUDIO",
        backgroundColor: "#c084fc",
        color: "#1a052e",
        borderRadius: 999,
        fontWeight: 700,
        fontSize: 11,
      },
      zIndex: 10,
    },
    {
      type: "text",
      frame: { x: PANEL_X, y: 184, w: PANEL_INNER_W, h: 144 },
      props: {
        text: name,
        variant: "display",
        fontSize: 40,
        fontWeight: 700,
        color: "#f5f3ff",
      },
      zIndex: 10,
    },
    {
      type: "text",
      frame: { x: PANEL_X, y: 344, w: PANEL_INNER_W, h: 80 },
      props: {
        text: "Cuts feitos para a câmera. Luz, ângulo e textura.",
        fontSize: 16,
        color: "#c4b5fd",
      },
      zIndex: 10,
    },
    {
      type: "button",
      frame: { x: PANEL_X, y: 464, w: 224, h: 48 },
      props: {
        text: "Bookar sessão",
        href: "book",
        backgroundColor: "#c084fc",
        color: "#1a052e",
        borderRadius: 999,
        fontWeight: 700,
      },
      zIndex: 10,
    },
    {
      type: "media",
      frame: {
        x: PAD,
        y: GALLERY_Y,
        w: TILE_W,
        h: TILE_H,
      },
      props: { backgroundColor: "#4c1d95", borderRadius: 16 },
    },
    {
      type: "media",
      frame: {
        x: PAD + TILE_W + TILE_GAP,
        y: GALLERY_Y,
        w: TILE_W,
        h: TILE_H,
      },
      props: { backgroundColor: "#5b21b6", borderRadius: 16 },
    },
    {
      type: "media",
      frame: {
        x: PAD + (TILE_W + TILE_GAP) * 2,
        y: GALLERY_Y,
        w: TILE_W,
        h: TILE_H,
      },
      props: { backgroundColor: "#6d28d9", borderRadius: 16 },
    },
    {
      type: "team",
      frame: { x: PAD, y: TEAM_Y, w: CONTENT_W, h: TEAM_H },
      props: { title: "Artistas", gridCols: 3 },
    },
    {
      type: "services",
      frame: { x: PAD, y: SERVICES_Y, w: CONTENT_W, h: SERVICES_H },
      props: { title: "Sessões", gridCols: 3 },
    },
    {
      type: "footer",
      frame: { x: 0, y: FOOTER_Y, w: DESK_W, h: FOOTER_H },
      props: { showPitch: true },
    },
  ]);
  /* Mobile: pad 16 · 3 tiles 112 gap 16 */
  const M_PAD = 16;
  const M_TILE = 112;
  const M_GAP = 16;
  const M_GALLERY_Y = 520;
  const mob = free("mobile", "studio", [
    { type: "navbar", frame: { x: 0, y: 0, w: MOB_W, h: 56 }, zIndex: 40 },
    {
      type: "media",
      frame: { x: 0, y: 56, w: MOB_W, h: 280 },
      props: { backgroundColor: "#2e1065", borderRadius: 0 },
    },
    {
      type: "text",
      frame: { x: M_PAD, y: 360, w: MOB_W - M_PAD * 2, h: 64 },
      props: { text: name, fontSize: 32, fontWeight: 700, color: "#f5f3ff" },
    },
    {
      type: "button",
      frame: { x: M_PAD, y: 440, w: 200, h: 48 },
      props: {
        text: "Bookar",
        href: "book",
        backgroundColor: "#c084fc",
        color: "#1a052e",
        borderRadius: 999,
        fontWeight: 700,
      },
    },
    {
      type: "media",
      frame: { x: M_PAD, y: M_GALLERY_Y, w: M_TILE, h: 104 },
      props: { backgroundColor: "#4c1d95", borderRadius: 12 },
    },
    {
      type: "media",
      frame: {
        x: M_PAD + M_TILE + M_GAP,
        y: M_GALLERY_Y,
        w: M_TILE,
        h: 104,
      },
      props: { backgroundColor: "#5b21b6", borderRadius: 12 },
    },
    {
      type: "media",
      frame: {
        x: M_PAD + (M_TILE + M_GAP) * 2,
        y: M_GALLERY_Y,
        w: M_TILE,
        h: 104,
      },
      props: { backgroundColor: "#6d28d9", borderRadius: 12 },
    },
    {
      type: "services",
      frame: {
        x: M_PAD,
        y: M_GALLERY_Y + 104 + M_PAD,
        w: MOB_W - M_PAD * 2,
        h: 480,
      },
      props: { title: "Sessões", gridCols: 1 },
    },
    {
      type: "footer",
      frame: { x: 0, y: 1184, w: MOB_W, h: 80 },
      props: { showPitch: true },
    },
  ]);
  return board(theme, 1920, 1320, [...desk, ...mob]);
}

/** Coluna única estreita centrada. */
function minimalTemplate(name: string): SiteCanvasConfig {
  const theme: CanvasTheme = {
    primary: "#171717",
    secondary: "#737373",
    background: "#fafafa",
    surface: "#ffffff",
    text: "#171717",
    fontDisplay: "var(--font-geist-sans), system-ui, sans-serif",
    fontBody: "var(--font-geist-sans), system-ui, sans-serif",
    radius: "sm",
    motion: "off",
  };
  const desk = free("desktop", "minimal", [
    { type: "navbar", frame: { x: 0, y: 0, w: 1440, h: 56 }, zIndex: 40 },
    {
      type: "spacer",
      frame: { x: 400, y: 80, w: 640, h: 80 },
      props: {},
    },
    {
      type: "text",
      frame: { x: 400, y: 160, w: 640, h: 80 },
      props: {
        text: name,
        variant: "display",
        fontSize: 48,
        fontWeight: 400,
        color: "#171717",
        align: "center",
      },
    },
    {
      type: "text",
      frame: { x: 400, y: 260, w: 640, h: 64 },
      props: {
        text: "Menos ruído. Mais corte. Uma página, uma decisão.",
        fontSize: 17,
        color: "#525252",
        align: "center",
      },
    },
    {
      type: "button",
      frame: { x: 560, y: 360, w: 320, h: 52 },
      props: {
        text: "Agendar",
        href: "book",
        backgroundColor: "transparent",
        color: "#171717",
        borderColor: "#171717",
        borderWidth: 1,
        borderRadius: 0,
        fontWeight: 600,
      },
    },
    {
      type: "divider",
      frame: { x: 400, y: 460, w: 640, h: 1 },
      props: { color: "#e5e5e5", thickness: 1 },
    },
    {
      type: "services",
      frame: { x: 400, y: 500, w: 640, h: 520 },
      props: { title: "Serviços", gridCols: 1 },
    },
    {
      type: "contact",
      frame: { x: 400, y: 1060, w: 640, h: 280 },
      props: { title: "Visite" },
    },
    {
      type: "footer",
      frame: { x: 0, y: 1400, w: 1440, h: 80 },
      props: { showPitch: false },
    },
  ]);
  const mob = free("mobile", "minimal", [
    { type: "navbar", frame: { x: 0, y: 0, w: 390, h: 52 }, zIndex: 40 },
    {
      type: "text",
      frame: { x: 32, y: 100, w: 326, h: 60 },
      props: {
        text: name,
        fontSize: 32,
        fontWeight: 400,
        color: "#171717",
        align: "center",
      },
    },
    {
      type: "button",
      frame: { x: 55, y: 200, w: 280, h: 48 },
      props: {
        text: "Agendar",
        href: "book",
        backgroundColor: "transparent",
        color: "#171717",
        borderColor: "#171717",
        borderWidth: 1,
        borderRadius: 0,
        fontWeight: 600,
      },
    },
    {
      type: "services",
      frame: { x: 24, y: 290, w: 342, h: 500 },
      props: { title: "Serviços", gridCols: 1 },
    },
    {
      type: "footer",
      frame: { x: 0, y: 840, w: 390, h: 70 },
      props: { showPitch: false },
    },
  ]);
  return board(theme, 1540, 960, [...desk, ...mob]);
}

/** Split vertical 50/50 + grid abaixo. */
function modernoTemplate(name: string): SiteCanvasConfig {
  const theme: CanvasTheme = {
    primary: "#22d3ee",
    secondary: "#67e8f9",
    background: "#020617",
    surface: "#0f172a",
    text: "#f8fafc",
    fontDisplay: "var(--font-geist-sans), system-ui, sans-serif",
    fontBody: "var(--font-geist-sans), system-ui, sans-serif",
    radius: "md",
    motion: "subtle",
  };
  const desk = free("desktop", "moderno", [
    { type: "navbar", frame: { x: 0, y: 0, w: 1440, h: 56 }, zIndex: 50 },
    {
      type: "rect",
      frame: { x: 0, y: 56, w: 720, h: 640 },
      props: { backgroundColor: "#020617", borderRadius: 0 },
    },
    {
      type: "rect",
      frame: { x: 720, y: 56, w: 720, h: 640 },
      props: { backgroundColor: "#0891b2", borderRadius: 0 },
    },
    {
      type: "text",
      frame: { x: 64, y: 180, w: 560, h: 140 },
      props: {
        text: name,
        variant: "display",
        fontSize: 52,
        fontWeight: 700,
        color: "#f8fafc",
      },
      zIndex: 10,
    },
    {
      type: "text",
      frame: { x: 64, y: 350, w: 520, h: 80 },
      props: {
        text: "Linhas retas. Contraste forte. Agenda digital.",
        fontSize: 18,
        color: "#94a3b8",
      },
      zIndex: 10,
    },
    {
      type: "button",
      frame: { x: 64, y: 480, w: 220, h: 52 },
      props: {
        text: "Agendar agora",
        href: "book",
        backgroundColor: "#22d3ee",
        color: "#020617",
        borderRadius: 8,
        fontWeight: 700,
      },
      zIndex: 10,
    },
    {
      type: "text",
      frame: { x: 800, y: 220, w: 560, h: 200 },
      props: {
        text: "FORMA\nFUNÇÃO\nFLUXO",
        fontSize: 56,
        fontWeight: 700,
        color: "#ecfeff",
        align: "left",
      },
      zIndex: 10,
    },
    {
      type: "grid",
      frame: { x: 64, y: 760, w: 1312, h: 260 },
      props: {
        title: "Módulos",
        gridCols: 3,
        cards: [
          { title: "Fade", description: "Geometria na nuca.", emoji: "◇" },
          { title: "Shape", description: "Contorno limpo.", emoji: "□" },
          { title: "Finish", description: "Detalhe final.", emoji: "△" },
        ],
        color: "#f8fafc",
      },
    },
    {
      type: "services",
      frame: { x: 64, y: 1080, w: 1312, h: 380 },
      props: { title: "Catálogo", gridCols: 3 },
    },
    {
      type: "footer",
      frame: { x: 0, y: 1520, w: 1440, h: 100 },
      props: { showPitch: true },
    },
  ]);
  const mob = free("mobile", "moderno", [
    { type: "navbar", frame: { x: 0, y: 0, w: 390, h: 52 }, zIndex: 40 },
    {
      type: "rect",
      frame: { x: 0, y: 52, w: 390, h: 280 },
      props: { backgroundColor: "#020617", borderRadius: 0 },
    },
    {
      type: "text",
      frame: { x: 20, y: 100, w: 350, h: 80 },
      props: {
        text: name,
        fontSize: 36,
        fontWeight: 700,
        color: "#f8fafc",
      },
      zIndex: 5,
    },
    {
      type: "button",
      frame: { x: 20, y: 220, w: 200, h: 48 },
      props: {
        text: "Agendar",
        href: "book",
        backgroundColor: "#22d3ee",
        color: "#020617",
        borderRadius: 8,
        fontWeight: 700,
      },
      zIndex: 5,
    },
    {
      type: "rect",
      frame: { x: 0, y: 332, w: 390, h: 160 },
      props: { backgroundColor: "#0891b2", borderRadius: 0 },
    },
    {
      type: "text",
      frame: { x: 20, y: 370, w: 350, h: 100 },
      props: {
        text: "FORMA · FUNÇÃO · FLUXO",
        fontSize: 22,
        fontWeight: 700,
        color: "#ecfeff",
      },
      zIndex: 5,
    },
    {
      type: "services",
      frame: { x: 16, y: 520, w: 358, h: 500 },
      props: { title: "Catálogo", gridCols: 1 },
    },
    {
      type: "footer",
      frame: { x: 0, y: 1060, w: 390, h: 80 },
      props: { showPitch: true },
    },
  ]);
  return board(theme, 1680, 1200, [...desk, ...mob]);
}

/** Magazine: headline + spine preta + pull-quote. */
function editorialTemplate(name: string): SiteCanvasConfig {
  const theme: CanvasTheme = {
    primary: "#1c1917",
    secondary: "#78716c",
    background: "#f5f0e8",
    surface: "#ebe4d8",
    text: "#1c1917",
    fontDisplay: 'Georgia, "Times New Roman", serif',
    fontBody: "var(--font-geist-sans), system-ui, sans-serif",
    radius: "sm",
    motion: "subtle",
  };
  const desk = free("desktop", "editorial", [
    {
      type: "rect",
      frame: { x: 0, y: 0, w: 220, h: 2000 },
      props: { backgroundColor: "#1c1917", borderRadius: 0 },
      zIndex: 1,
    },
    {
      type: "text",
      frame: { x: 28, y: 80, w: 160, h: 400 },
      props: {
        text: "VOL.\n01\n—\nCUT",
        fontSize: 22,
        fontWeight: 700,
        color: "#f5f0e8",
        align: "center",
      },
      zIndex: 5,
    },
    { type: "navbar", frame: { x: 220, y: 0, w: 1220, h: 56 }, zIndex: 40 },
    {
      type: "text",
      frame: { x: 280, y: 100, w: 1000, h: 160 },
      props: {
        text: name.toUpperCase(),
        variant: "display",
        fontSize: 72,
        fontWeight: 400,
        color: "#1c1917",
      },
    },
    {
      type: "text",
      frame: { x: 280, y: 290, w: 700, h: 80 },
      props: {
        text: "A edição desta estação: cortes limpos, tipografia forte e zero stock photo.",
        fontSize: 20,
        color: "#57534e",
      },
    },
    {
      type: "button",
      frame: { x: 280, y: 400, w: 200, h: 48 },
      props: {
        text: "Agendar",
        href: "book",
        backgroundColor: "#1c1917",
        color: "#f5f0e8",
        borderRadius: 0,
        fontWeight: 700,
      },
    },
    {
      type: "panel",
      frame: { x: 280, y: 500, w: 900, h: 160 },
      props: {
        title: "“O corte certo é editorial.”",
        description: "— assinatura da casa",
        variant: "flat",
        backgroundColor: "#ebe4d8",
        borderColor: "#1c1917",
        borderRadius: 0,
        padding: 28,
        color: "#1c1917",
      },
    },
    {
      type: "media",
      frame: { x: 280, y: 720, w: 560, h: 360 },
      props: { backgroundColor: "#d6d3d1", borderRadius: 0 },
    },
    {
      type: "services",
      frame: { x: 880, y: 720, w: 480, h: 360 },
      props: { title: "Índice", gridCols: 1 },
    },
    {
      type: "team",
      frame: { x: 280, y: 1140, w: 1080, h: 300 },
      props: { title: "Colaboradores", gridCols: 3 },
    },
    {
      type: "footer",
      frame: { x: 220, y: 1500, w: 1220, h: 90 },
      props: { showPitch: true },
    },
  ]);
  const mob = free("mobile", "editorial", [
    {
      type: "rect",
      frame: { x: 0, y: 0, w: 390, h: 48 },
      props: { backgroundColor: "#1c1917", borderRadius: 0 },
    },
    {
      type: "text",
      frame: { x: 16, y: 12, w: 358, h: 28 },
      props: {
        text: "VOL. 01 — CUT",
        fontSize: 12,
        fontWeight: 700,
        color: "#f5f0e8",
        align: "center",
      },
      zIndex: 5,
    },
    { type: "navbar", frame: { x: 0, y: 48, w: 390, h: 52 }, zIndex: 40 },
    {
      type: "text",
      frame: { x: 16, y: 120, w: 358, h: 90 },
      props: {
        text: name.toUpperCase(),
        fontSize: 36,
        fontWeight: 400,
        color: "#1c1917",
      },
    },
    {
      type: "panel",
      frame: { x: 16, y: 230, w: 358, h: 120 },
      props: {
        title: "“O corte certo é editorial.”",
        description: "— assinatura",
        backgroundColor: "#ebe4d8",
        borderRadius: 0,
        padding: 16,
        color: "#1c1917",
      },
    },
    {
      type: "button",
      frame: { x: 16, y: 380, w: 180, h: 48 },
      props: {
        text: "Agendar",
        href: "book",
        backgroundColor: "#1c1917",
        color: "#f5f0e8",
        borderRadius: 0,
        fontWeight: 700,
      },
    },
    {
      type: "services",
      frame: { x: 16, y: 460, w: 358, h: 480 },
      props: { title: "Índice", gridCols: 1 },
    },
    {
      type: "footer",
      frame: { x: 0, y: 980, w: 390, h: 80 },
      props: { showPitch: true },
    },
  ]);
  return board(theme, 1650, 1120, [...desk, ...mob]);
}

/** Hero full-bleed + faixa + 3 blocos numerados. */
function impactoTemplate(name: string): SiteCanvasConfig {
  const theme: CanvasTheme = {
    primary: "#fb923c",
    secondary: "#fdba74",
    background: "#030303",
    surface: "#111111",
    text: "#fafafa",
    fontDisplay: "var(--font-geist-sans), system-ui, sans-serif",
    fontBody: "var(--font-geist-sans), system-ui, sans-serif",
    radius: "sm",
    motion: "full",
  };
  const desk = free("desktop", "impacto", [
    {
      type: "hero",
      frame: { x: 0, y: 0, w: 1440, h: 720 },
      props: {
        eyebrow: "AGORA",
        title: name.toUpperCase(),
        description: "Sem meio-termo. Tipografia grossa. CTA forte.",
        ctaLabel: "AGENDAR →",
        href: "book",
        backgroundColor: "#111111",
        overlay: 0.55,
        color: "#fafafa",
        borderRadius: 0,
      },
      zIndex: 5,
    },
    { type: "navbar", frame: { x: 0, y: 0, w: 1440, h: 64 }, zIndex: 60 },
    {
      type: "panel",
      frame: { x: 0, y: 720, w: 1440, h: 120 },
      props: {
        title: "SEM FILA. SEM ENROLE.",
        description: "Escolha o horário e aparece.",
        backgroundColor: "#fb923c",
        borderRadius: 0,
        padding: 32,
        color: "#030303",
      },
    },
    {
      type: "panel",
      frame: { x: 64, y: 900, w: 400, h: 200 },
      props: {
        title: "01 — CUT",
        description: "Linha forte.",
        variant: "flat",
        backgroundColor: "#171717",
        borderColor: "#404040",
        borderRadius: 0,
        padding: 28,
        color: "#fafafa",
      },
    },
    {
      type: "panel",
      frame: { x: 520, y: 900, w: 400, h: 200 },
      props: {
        title: "02 — FADE",
        description: "Degradê preciso.",
        variant: "flat",
        backgroundColor: "#171717",
        borderColor: "#404040",
        borderRadius: 0,
        padding: 28,
        color: "#fafafa",
      },
    },
    {
      type: "panel",
      frame: { x: 976, y: 900, w: 400, h: 200 },
      props: {
        title: "03 — COMBO",
        description: "Ritual completo.",
        variant: "flat",
        backgroundColor: "#171717",
        borderColor: "#404040",
        borderRadius: 0,
        padding: 28,
        color: "#fafafa",
      },
    },
    {
      type: "services",
      frame: { x: 64, y: 1160, w: 1312, h: 380 },
      props: { title: "MENU", gridCols: 3 },
    },
    {
      type: "footer",
      frame: { x: 0, y: 1600, w: 1440, h: 100 },
      props: { showPitch: true },
    },
  ]);
  const mob = free("mobile", "impacto", [
    {
      type: "hero",
      frame: { x: 0, y: 0, w: 390, h: 420 },
      props: {
        eyebrow: "AGORA",
        title: name.toUpperCase(),
        description: "Impacto full-bleed.",
        ctaLabel: "AGENDAR",
        href: "book",
        backgroundColor: "#111111",
        overlay: 0.55,
        color: "#fafafa",
      },
      zIndex: 5,
    },
    { type: "navbar", frame: { x: 0, y: 0, w: 390, h: 56 }, zIndex: 60 },
    {
      type: "panel",
      frame: { x: 0, y: 420, w: 390, h: 100 },
      props: {
        title: "SEM FILA",
        description: "Agenda rápida.",
        backgroundColor: "#fb923c",
        borderRadius: 0,
        padding: 20,
        color: "#030303",
      },
    },
    {
      type: "services",
      frame: { x: 16, y: 560, w: 358, h: 500 },
      props: { title: "MENU", gridCols: 1 },
    },
    {
      type: "footer",
      frame: { x: 0, y: 1100, w: 390, h: 80 },
      props: { showPitch: true },
    },
  ]);
  return board(theme, 1760, 1240, [...desk, ...mob]);
}

/** Sidebar 280 ouro + conteúdo offset. */
function noirTemplate(name: string): SiteCanvasConfig {
  const theme: CanvasTheme = {
    primary: "#d4af37",
    secondary: "#a8a29e",
    background: "#0c0a09",
    surface: "#1c1917",
    text: "#fafaf9",
    fontDisplay: 'Georgia, "Times New Roman", serif',
    fontBody: "var(--font-geist-sans), system-ui, sans-serif",
    radius: "md",
    motion: "subtle",
  };
  const desk = free("desktop", "noir", [
    {
      type: "rect",
      frame: { x: 0, y: 0, w: 280, h: 2200 },
      props: { backgroundColor: "#1c1917", borderRadius: 0 },
      zIndex: 1,
    },
    {
      type: "rect",
      frame: { x: 280, y: 0, w: 4, h: 2200 },
      props: { backgroundColor: "#d4af37", borderRadius: 0 },
      zIndex: 2,
    },
    {
      type: "text",
      frame: { x: 24, y: 80, w: 230, h: 120 },
      props: {
        text: name,
        fontSize: 28,
        fontWeight: 400,
        color: "#d4af37",
      },
      zIndex: 10,
    },
    {
      type: "button",
      frame: { x: 24, y: 240, w: 200, h: 48 },
      props: {
        text: "Reservar",
        href: "book",
        backgroundColor: "transparent",
        color: "#d4af37",
        borderColor: "#d4af37",
        borderWidth: 1,
        borderRadius: 999,
        fontWeight: 700,
      },
      zIndex: 10,
    },
    {
      type: "text",
      frame: { x: 24, y: 340, w: 220, h: 200 },
      props: {
        text: "Escuro.\nOuro fino.\nEixo deslocado.",
        fontSize: 15,
        color: "#a8a29e",
      },
      zIndex: 10,
    },
    { type: "navbar", frame: { x: 284, y: 0, w: 1156, h: 56 }, zIndex: 40 },
    {
      type: "text",
      frame: { x: 360, y: 120, w: 960, h: 100 },
      props: {
        text: "Noite. Luz baixa. Acabamento alto.",
        variant: "display",
        fontSize: 48,
        fontWeight: 400,
        color: "#fafaf9",
      },
    },
    {
      type: "media",
      frame: { x: 360, y: 260, w: 960, h: 420 },
      props: { backgroundColor: "#292524", borderRadius: 16 },
    },
    {
      type: "services",
      frame: { x: 360, y: 740, w: 960, h: 400 },
      props: { title: "Carta", gridCols: 2 },
    },
    {
      type: "team",
      frame: { x: 360, y: 1180, w: 960, h: 320 },
      props: { title: "Artistas", gridCols: 3 },
    },
    {
      type: "footer",
      frame: { x: 284, y: 1560, w: 1156, h: 90 },
      props: { showPitch: true },
    },
  ]);
  const mob = free("mobile", "noir", [
    {
      type: "rect",
      frame: { x: 0, y: 0, w: 390, h: 8 },
      props: { backgroundColor: "#d4af37", borderRadius: 0 },
    },
    { type: "navbar", frame: { x: 0, y: 8, w: 390, h: 52 }, zIndex: 40 },
    {
      type: "text",
      frame: { x: 20, y: 90, w: 350, h: 70 },
      props: {
        text: name,
        fontSize: 32,
        fontWeight: 400,
        color: "#d4af37",
      },
    },
    {
      type: "button",
      frame: { x: 20, y: 180, w: 200, h: 48 },
      props: {
        text: "Reservar",
        href: "book",
        backgroundColor: "transparent",
        color: "#d4af37",
        borderColor: "#d4af37",
        borderWidth: 1,
        borderRadius: 999,
        fontWeight: 700,
      },
    },
    {
      type: "media",
      frame: { x: 20, y: 260, w: 350, h: 200 },
      props: { backgroundColor: "#292524", borderRadius: 16 },
    },
    {
      type: "services",
      frame: { x: 16, y: 500, w: 358, h: 480 },
      props: { title: "Carta", gridCols: 1 },
    },
    {
      type: "footer",
      frame: { x: 0, y: 1020, w: 390, h: 80 },
      props: { showPitch: true },
    },
  ]);
  return board(theme, 1720, 1160, [...desk, ...mob]);
}

/** Barras verticais + ticker + lista densa mono. */
function neonTemplate(name: string): SiteCanvasConfig {
  const theme: CanvasTheme = {
    primary: "#a3e635",
    secondary: "#e879f9",
    background: "#030712",
    surface: "#111827",
    text: "#ecfccb",
    fontDisplay: "var(--font-geist-mono), ui-monospace, monospace",
    fontBody: "var(--font-geist-mono), ui-monospace, monospace",
    radius: "sm",
    motion: "full",
  };
  const desk = free("desktop", "neon", [
    {
      type: "rect",
      frame: { x: 48, y: 0, w: 12, h: 1900 },
      props: { backgroundColor: "#a3e635", borderRadius: 0 },
      zIndex: 30,
    },
    {
      type: "rect",
      frame: { x: 1380, y: 0, w: 12, h: 1900 },
      props: { backgroundColor: "#e879f9", borderRadius: 0 },
      zIndex: 30,
    },
    { type: "navbar", frame: { x: 72, y: 24, w: 1296, h: 48 }, zIndex: 40 },
    {
      type: "panel",
      frame: { x: 72, y: 100, w: 1296, h: 48 },
      props: {
        title: "// LIVE  ·  SLOTS OPEN  ·  NO QUEUE  ·  CUT SYSTEM ONLINE",
        description: "",
        backgroundColor: "#111827",
        borderColor: "#a3e635",
        borderRadius: 0,
        padding: 12,
        color: "#a3e635",
      },
    },
    {
      type: "text",
      frame: { x: 88, y: 200, w: 900, h: 160 },
      props: {
        text: `${name.toUpperCase()}\n// ONLINE`,
        variant: "display",
        fontSize: 64,
        fontWeight: 700,
        color: "#a3e635",
      },
    },
    {
      type: "badge",
      frame: { x: 1100, y: 220, w: 160, h: 36 },
      props: {
        text: "SIGNAL",
        backgroundColor: "#e879f9",
        color: "#030712",
        borderRadius: 4,
        fontWeight: 700,
      },
    },
    {
      type: "panel",
      frame: { x: 900, y: 320, w: 440, h: 220 },
      props: {
        title: "STATUS: OK",
        description: "Slots em tempo real. Sem fila no WhatsApp.",
        variant: "accent",
        backgroundColor: "#111827",
        borderColor: "#e879f9",
        thickness: 3,
        padding: 24,
        color: "#ecfccb",
      },
    },
    {
      type: "button",
      frame: { x: 88, y: 420, w: 240, h: 52 },
      props: {
        text: "BOOK_NOW()",
        href: "book",
        backgroundColor: "#a3e635",
        color: "#030712",
        borderRadius: 0,
        fontWeight: 700,
      },
    },
    {
      type: "services",
      frame: { x: 88, y: 600, w: 700, h: 700 },
      props: { title: "CATALOG.txt", gridCols: 1 },
    },
    {
      type: "team",
      frame: { x: 820, y: 600, w: 520, h: 520 },
      props: { title: "OPS", gridCols: 1 },
    },
    {
      type: "footer",
      frame: { x: 72, y: 1400, w: 1296, h: 80 },
      props: { showPitch: true },
    },
  ]);
  const mob = free("mobile", "neon", [
    {
      type: "rect",
      frame: { x: 0, y: 0, w: 6, h: 1100 },
      props: { backgroundColor: "#a3e635", borderRadius: 0 },
    },
    {
      type: "rect",
      frame: { x: 384, y: 0, w: 6, h: 1100 },
      props: { backgroundColor: "#e879f9", borderRadius: 0 },
    },
    { type: "navbar", frame: { x: 12, y: 12, w: 366, h: 48 }, zIndex: 40 },
    {
      type: "panel",
      frame: { x: 12, y: 80, w: 366, h: 40 },
      props: {
        title: "// LIVE · SLOTS OPEN",
        backgroundColor: "#111827",
        borderRadius: 0,
        padding: 8,
        color: "#a3e635",
      },
    },
    {
      type: "text",
      frame: { x: 16, y: 140, w: 358, h: 90 },
      props: {
        text: `${name.toUpperCase()}\n// ONLINE`,
        fontSize: 28,
        fontWeight: 700,
        color: "#a3e635",
      },
    },
    {
      type: "button",
      frame: { x: 16, y: 260, w: 200, h: 48 },
      props: {
        text: "BOOK_NOW()",
        href: "book",
        backgroundColor: "#a3e635",
        color: "#030712",
        borderRadius: 0,
        fontWeight: 700,
      },
    },
    {
      type: "services",
      frame: { x: 16, y: 340, w: 358, h: 520 },
      props: { title: "CATALOG", gridCols: 1 },
    },
    {
      type: "footer",
      frame: { x: 12, y: 900, w: 366, h: 70 },
      props: { showPitch: true },
    },
  ]);
  return board(theme, 1560, 1020, [...desk, ...mob]);
}

/** Grade bordada / carimbo / zero radius. */
function brutalistaTemplate(name: string): SiteCanvasConfig {
  const theme: CanvasTheme = {
    primary: "#171717",
    secondary: "#737373",
    background: "#d4d4d4",
    surface: "#e5e5e5",
    text: "#171717",
    fontDisplay: "var(--font-geist-sans), system-ui, sans-serif",
    fontBody: "var(--font-geist-sans), system-ui, sans-serif",
    radius: "sm",
    motion: "off",
  };
  const desk = free("desktop", "brutalista", [
    {
      type: "rect",
      frame: { x: 40, y: 40, w: 1360, h: 1680 },
      props: {
        backgroundColor: "#e5e5e5",
        borderColor: "#171717",
        borderRadius: 0,
      },
      zIndex: 1,
    },
    {
      type: "rect",
      frame: { x: 40, y: 40, w: 220, h: 220 },
      props: { backgroundColor: "#171717", borderRadius: 0 },
      zIndex: 20,
    },
    {
      type: "text",
      frame: { x: 60, y: 100, w: 180, h: 100 },
      props: {
        text: "RAW\nCUT",
        fontSize: 32,
        fontWeight: 700,
        color: "#fafafa",
        align: "center",
      },
      zIndex: 25,
    },
    {
      type: "text",
      frame: { x: 300, y: 80, w: 1050, h: 100 },
      props: {
        text: name.toUpperCase(),
        variant: "display",
        fontSize: 64,
        fontWeight: 700,
        color: "#171717",
      },
      zIndex: 10,
    },
    {
      type: "text",
      frame: { x: 300, y: 200, w: 800, h: 40 },
      props: {
        text: "SEM ORNAMENTO. SÓ CORTE E CONCRETO.",
        fontSize: 14,
        fontWeight: 700,
        color: "#525252",
      },
      zIndex: 10,
    },
    {
      type: "button",
      frame: { x: 300, y: 260, w: 240, h: 56 },
      props: {
        text: "MARCAR",
        href: "book",
        backgroundColor: "#171717",
        color: "#fafafa",
        borderRadius: 0,
        fontWeight: 700,
        borderWidth: 4,
        borderColor: "#171717",
      },
      zIndex: 10,
    },
    {
      type: "panel",
      frame: { x: 40, y: 360, w: 680, h: 240 },
      props: {
        title: "BLOCO A",
        description: "Estrutura aparente. Sem shadow. Só função.",
        variant: "flat",
        backgroundColor: "#e5e5e5",
        borderColor: "#171717",
        borderRadius: 0,
        padding: 28,
        color: "#171717",
      },
      zIndex: 5,
    },
    {
      type: "panel",
      frame: { x: 720, y: 360, w: 680, h: 240 },
      props: {
        title: "BLOCO B",
        description: "Agenda clara. Sem carrossel.",
        variant: "flat",
        backgroundColor: "#fafafa",
        borderColor: "#171717",
        borderRadius: 0,
        padding: 28,
        color: "#171717",
      },
      zIndex: 5,
    },
    {
      type: "services",
      frame: { x: 40, y: 600, w: 1360, h: 440 },
      props: { title: "LISTA DE PREÇOS", gridCols: 3 },
      zIndex: 5,
    },
    {
      type: "contact",
      frame: { x: 40, y: 1080, w: 1360, h: 320 },
      props: { title: "ENDEREÇO" },
      zIndex: 5,
    },
    {
      type: "footer",
      frame: { x: 40, y: 1440, w: 1360, h: 80 },
      props: { showPitch: false },
      zIndex: 5,
    },
  ]);
  const mob = free("mobile", "brutalista", [
    {
      type: "rect",
      frame: { x: 12, y: 12, w: 120, h: 120 },
      props: { backgroundColor: "#171717", borderRadius: 0 },
    },
    {
      type: "text",
      frame: { x: 28, y: 48, w: 90, h: 50 },
      props: {
        text: "RAW\nCUT",
        fontSize: 18,
        fontWeight: 700,
        color: "#fafafa",
        align: "center",
      },
      zIndex: 5,
    },
    {
      type: "text",
      frame: { x: 148, y: 30, w: 230, h: 80 },
      props: {
        text: name.toUpperCase(),
        fontSize: 22,
        fontWeight: 700,
        color: "#171717",
      },
    },
    {
      type: "button",
      frame: { x: 16, y: 160, w: 200, h: 48 },
      props: {
        text: "MARCAR",
        href: "book",
        backgroundColor: "#171717",
        color: "#fafafa",
        borderRadius: 0,
        fontWeight: 700,
      },
    },
    {
      type: "panel",
      frame: { x: 12, y: 230, w: 366, h: 120 },
      props: {
        title: "BLOCO A",
        description: "Só função.",
        backgroundColor: "#e5e5e5",
        borderColor: "#171717",
        borderRadius: 0,
        padding: 16,
        color: "#171717",
      },
    },
    {
      type: "services",
      frame: { x: 12, y: 370, w: 366, h: 500 },
      props: { title: "LISTA", gridCols: 1 },
    },
    {
      type: "footer",
      frame: { x: 12, y: 900, w: 366, h: 70 },
      props: { showPitch: false },
    },
  ]);
  return board(theme, 1760, 1020, [...desk, ...mob]);
}

/** Faixas horizontais em maré + glass desalinhados. */
function oceanTemplate(name: string): SiteCanvasConfig {
  const theme: CanvasTheme = {
    primary: "#38bdf8",
    secondary: "#7dd3fc",
    background: "#0c4a6e",
    surface: "#075985",
    text: "#e0f2fe",
    fontDisplay: "var(--font-geist-sans), system-ui, sans-serif",
    fontBody: "var(--font-geist-sans), system-ui, sans-serif",
    radius: "lg",
    motion: "subtle",
  };
  const desk = free("desktop", "ocean", [
    {
      type: "rect",
      frame: { x: 0, y: 0, w: 1440, h: 160 },
      props: { backgroundColor: "#0369a1", borderRadius: 0 },
    },
    {
      type: "rect",
      frame: { x: 0, y: 160, w: 1440, h: 280 },
      props: { backgroundColor: "#0284c7", borderRadius: 0 },
    },
    {
      type: "rect",
      frame: { x: 0, y: 440, w: 1440, h: 120 },
      props: { backgroundColor: "#0ea5e9", borderRadius: 0 },
    },
    {
      type: "text",
      frame: { x: 80, y: 200, w: 800, h: 100 },
      props: {
        text: name,
        variant: "display",
        fontSize: 64,
        fontWeight: 600,
        color: "#e0f2fe",
      },
      zIndex: 10,
    },
    {
      type: "text",
      frame: { x: 80, y: 320, w: 520, h: 48 },
      props: {
        text: "Fluxo calmo. Cortes limpos. Maré certa pra agendar.",
        fontSize: 18,
        color: "#bae6fd",
      },
      zIndex: 10,
    },
    {
      type: "button",
      frame: { x: 1100, y: 260, w: 220, h: 52 },
      props: {
        text: "Agendar",
        href: "book",
        backgroundColor: "#38bdf8",
        color: "#0c4a6e",
        borderRadius: 999,
        fontWeight: 700,
      },
      zIndex: 10,
    },
    {
      type: "panel",
      frame: { x: 80, y: 600, w: 380, h: 200 },
      props: {
        title: "Manhã",
        description: "Luz natural e café. Ideal pra fade.",
        variant: "glass",
        backgroundColor: "#0284c740",
        borderColor: "#7dd3fc66",
        borderRadius: 24,
        padding: 24,
        color: "#e0f2fe",
      },
    },
    {
      type: "panel",
      frame: { x: 520, y: 660, w: 380, h: 200 },
      props: {
        title: "Tarde",
        description: "Fluxo contínuo. Encaixe rápido.",
        variant: "glass",
        backgroundColor: "#0284c740",
        borderColor: "#7dd3fc66",
        borderRadius: 24,
        padding: 24,
        color: "#e0f2fe",
      },
    },
    {
      type: "panel",
      frame: { x: 960, y: 580, w: 380, h: 220 },
      props: {
        title: "Noite",
        description: "Ambiente fechado, acabamento fino.",
        variant: "glass",
        backgroundColor: "#0284c740",
        borderColor: "#7dd3fc66",
        borderRadius: 24,
        padding: 24,
        color: "#e0f2fe",
      },
    },
    {
      type: "services",
      frame: { x: 80, y: 920, w: 1280, h: 360 },
      props: { title: "Serviços", gridCols: 3 },
    },
    {
      type: "team",
      frame: { x: 80, y: 1320, w: 1280, h: 300 },
      props: { title: "Equipe", gridCols: 3 },
    },
    {
      type: "footer",
      frame: { x: 0, y: 1680, w: 1440, h: 90 },
      props: { showPitch: true },
    },
  ]);
  const mob = free("mobile", "ocean", [
    {
      type: "rect",
      frame: { x: 0, y: 0, w: 390, h: 80 },
      props: { backgroundColor: "#0369a1", borderRadius: 0 },
    },
    {
      type: "rect",
      frame: { x: 0, y: 80, w: 390, h: 180 },
      props: { backgroundColor: "#0284c7", borderRadius: 0 },
    },
    {
      type: "text",
      frame: { x: 16, y: 110, w: 358, h: 60 },
      props: {
        text: name,
        fontSize: 32,
        fontWeight: 600,
        color: "#e0f2fe",
      },
      zIndex: 5,
    },
    {
      type: "button",
      frame: { x: 16, y: 190, w: 180, h: 44 },
      props: {
        text: "Agendar",
        href: "book",
        backgroundColor: "#38bdf8",
        color: "#0c4a6e",
        borderRadius: 999,
        fontWeight: 700,
      },
      zIndex: 5,
    },
    {
      type: "panel",
      frame: { x: 16, y: 300, w: 358, h: 120 },
      props: {
        title: "Manhã",
        description: "Luz natural.",
        backgroundColor: "#0284c740",
        borderRadius: 20,
        padding: 16,
        color: "#e0f2fe",
      },
    },
    {
      type: "panel",
      frame: { x: 32, y: 440, w: 358, h: 120 },
      props: {
        title: "Tarde",
        description: "Fluxo contínuo.",
        backgroundColor: "#0284c740",
        borderRadius: 20,
        padding: 16,
        color: "#e0f2fe",
      },
    },
    {
      type: "services",
      frame: { x: 16, y: 590, w: 358, h: 480 },
      props: { title: "Serviços", gridCols: 1 },
    },
    {
      type: "footer",
      frame: { x: 0, y: 1120, w: 390, h: 80 },
      props: { showPitch: true },
    },
  ]);
  return board(theme, 1820, 1260, [...desk, ...mob]);
}

/** Ritual centrado, sem navbar no hero, painéis soft. */
function boutiqueTemplate(name: string): SiteCanvasConfig {
  const theme: CanvasTheme = {
    primary: "#e11d48",
    secondary: "#fda4af",
    background: "#fff1f2",
    surface: "#ffe4e6",
    text: "#4c0519",
    fontDisplay: 'Georgia, "Times New Roman", serif',
    fontBody: "var(--font-geist-sans), system-ui, sans-serif",
    radius: "lg",
    motion: "subtle",
  };
  const desk = free("desktop", "boutique", [
    {
      type: "badge",
      frame: { x: 620, y: 80, w: 200, h: 28 },
      props: {
        text: "BOUTIQUE",
        backgroundColor: "transparent",
        color: "#e11d48",
        borderColor: "#e11d48",
        borderWidth: 1,
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
      },
    },
    {
      type: "text",
      frame: { x: 200, y: 140, w: 1040, h: 110 },
      props: {
        text: name,
        variant: "display",
        fontSize: 68,
        fontWeight: 400,
        color: "#4c0519",
        align: "center",
      },
    },
    {
      type: "text",
      frame: { x: 360, y: 280, w: 720, h: 56 },
      props: {
        text: "Grooming cuidadoso. Detalhe no acabamento. Ambiente acolhedor.",
        fontSize: 18,
        color: "#9f1239",
        align: "center",
      },
    },
    {
      type: "button",
      frame: { x: 540, y: 380, w: 360, h: 56 },
      props: {
        text: "Reservar experiência",
        href: "book",
        backgroundColor: "#e11d48",
        color: "#fff1f2",
        borderRadius: 999,
        fontWeight: 700,
      },
    },
    {
      type: "spacer",
      frame: { x: 400, y: 480, w: 640, h: 40 },
      props: {},
    },
    {
      type: "panel",
      frame: { x: 160, y: 540, w: 520, h: 220 },
      props: {
        title: "Ateliê",
        description: "Consulta de estilo antes do corte.",
        variant: "card",
        backgroundColor: "#ffe4e6",
        borderColor: "#fecdd3",
        borderRadius: 40,
        padding: 32,
        color: "#4c0519",
      },
    },
    {
      type: "panel",
      frame: { x: 760, y: 540, w: 520, h: 220 },
      props: {
        title: "Ritual",
        description: "Toalha quente, óleo e alinhamento.",
        variant: "card",
        backgroundColor: "#ffe4e6",
        borderColor: "#fecdd3",
        borderRadius: 40,
        padding: 32,
        color: "#4c0519",
      },
    },
    {
      type: "services",
      frame: { x: 200, y: 840, w: 1040, h: 400 },
      props: { title: "Carta", gridCols: 2 },
    },
    {
      type: "team",
      frame: { x: 200, y: 1280, w: 1040, h: 300 },
      props: { title: "Especialistas", gridCols: 3 },
    },
    { type: "navbar", frame: { x: 200, y: 1640, w: 1040, h: 56 }, zIndex: 40 },
    {
      type: "footer",
      frame: { x: 0, y: 1740, w: 1440, h: 90 },
      props: { showPitch: true },
    },
  ]);
  const mob = free("mobile", "boutique", [
    {
      type: "badge",
      frame: { x: 115, y: 40, w: 160, h: 28 },
      props: {
        text: "BOUTIQUE",
        backgroundColor: "transparent",
        color: "#e11d48",
        borderColor: "#e11d48",
        borderWidth: 1,
        borderRadius: 999,
        fontWeight: 700,
      },
    },
    {
      type: "text",
      frame: { x: 20, y: 90, w: 350, h: 80 },
      props: {
        text: name,
        fontSize: 36,
        fontWeight: 400,
        color: "#4c0519",
        align: "center",
      },
    },
    {
      type: "button",
      frame: { x: 55, y: 200, w: 280, h: 48 },
      props: {
        text: "Reservar",
        href: "book",
        backgroundColor: "#e11d48",
        color: "#fff1f2",
        borderRadius: 999,
        fontWeight: 700,
      },
    },
    {
      type: "panel",
      frame: { x: 20, y: 280, w: 350, h: 140 },
      props: {
        title: "Ateliê",
        description: "Consulta de estilo.",
        backgroundColor: "#ffe4e6",
        borderRadius: 28,
        padding: 20,
        color: "#4c0519",
      },
    },
    {
      type: "panel",
      frame: { x: 20, y: 440, w: 350, h: 140 },
      props: {
        title: "Ritual",
        description: "Toalha e óleo.",
        backgroundColor: "#ffe4e6",
        borderRadius: 28,
        padding: 20,
        color: "#4c0519",
      },
    },
    {
      type: "services",
      frame: { x: 16, y: 610, w: 358, h: 480 },
      props: { title: "Carta", gridCols: 1 },
    },
    {
      type: "footer",
      frame: { x: 0, y: 1140, w: 390, h: 80 },
      props: { showPitch: true },
    },
  ]);
  return board(theme, 1880, 1280, [...desk, ...mob]);
}

/** 3 formas primárias no viewport + faixas de princípios. */
function bauhausTemplate(name: string): SiteCanvasConfig {
  const theme: CanvasTheme = {
    primary: "#ef4444",
    secondary: "#3b82f6",
    background: "#fafafa",
    surface: "#ffffff",
    text: "#171717",
    fontDisplay: "var(--font-geist-sans), system-ui, sans-serif",
    fontBody: "var(--font-geist-sans), system-ui, sans-serif",
    radius: "sm",
    motion: "off",
  };
  const desk = free("desktop", "bauhaus", [
    {
      type: "rect",
      frame: { x: 80, y: 80, w: 360, h: 360 },
      props: { backgroundColor: "#ef4444", borderRadius: 0 },
    },
    {
      type: "rect",
      frame: { x: 480, y: 80, w: 360, h: 360 },
      props: { backgroundColor: "#3b82f6", borderRadius: 999 },
    },
    {
      type: "rect",
      frame: { x: 880, y: 80, w: 360, h: 360 },
      props: { backgroundColor: "#3b82f6", borderRadius: 0 },
    },
    {
      type: "text",
      frame: { x: 80, y: 480, w: 700, h: 80 },
      props: {
        text: name.toUpperCase(),
        variant: "display",
        fontSize: 48,
        fontWeight: 700,
        color: "#171717",
      },
    },
    {
      type: "text",
      frame: { x: 80, y: 580, w: 600, h: 40 },
      props: {
        text: "FORMA · COR · FUNÇÃO",
        fontSize: 16,
        fontWeight: 700,
        color: "#525252",
      },
    },
    {
      type: "button",
      frame: { x: 1000, y: 500, w: 220, h: 52 },
      props: {
        text: "Agendar",
        href: "book",
        backgroundColor: "#171717",
        color: "#fafafa",
        borderRadius: 0,
        fontWeight: 700,
      },
    },
    {
      type: "rect",
      frame: { x: 0, y: 680, w: 480, h: 80 },
      props: { backgroundColor: "#ef4444", borderRadius: 0 },
    },
    {
      type: "rect",
      frame: { x: 480, y: 680, w: 480, h: 80 },
      props: { backgroundColor: "#3b82f6", borderRadius: 0 },
    },
    {
      type: "rect",
      frame: { x: 960, y: 680, w: 480, h: 80 },
      props: { backgroundColor: "#3b82f6", borderRadius: 0 },
    },
    {
      type: "text",
      frame: { x: 40, y: 700, w: 400, h: 40 },
      props: {
        text: "VERMELHO — energia",
        fontSize: 16,
        fontWeight: 700,
        color: "#fafafa",
      },
      zIndex: 5,
    },
    {
      type: "text",
      frame: { x: 520, y: 700, w: 400, h: 40 },
      props: {
        text: "AZUL — precisão",
        fontSize: 16,
        fontWeight: 700,
        color: "#fafafa",
      },
      zIndex: 5,
    },
    {
      type: "text",
      frame: { x: 1000, y: 700, w: 400, h: 40 },
      props: {
        text: "AMARELO — detalhe",
        fontSize: 16,
        fontWeight: 700,
        color: "#171717",
      },
      zIndex: 5,
    },
    {
      type: "services",
      frame: { x: 80, y: 820, w: 1280, h: 400 },
      props: { title: "Serviços", gridCols: 3 },
    },
    {
      type: "contact",
      frame: { x: 80, y: 1280, w: 1280, h: 300 },
      props: { title: "Visite" },
    },
    {
      type: "footer",
      frame: { x: 0, y: 1640, w: 1440, h: 80 },
      props: { showPitch: false },
    },
  ]);
  const mob = free("mobile", "bauhaus", [
    {
      type: "rect",
      frame: { x: 16, y: 24, w: 110, h: 110 },
      props: { backgroundColor: "#ef4444", borderRadius: 0 },
    },
    {
      type: "rect",
      frame: { x: 140, y: 24, w: 110, h: 110 },
      props: { backgroundColor: "#3b82f6", borderRadius: 999 },
    },
    {
      type: "rect",
      frame: { x: 264, y: 24, w: 110, h: 110 },
      props: { backgroundColor: "#3b82f6", borderRadius: 0 },
    },
    {
      type: "text",
      frame: { x: 16, y: 160, w: 358, h: 60 },
      props: {
        text: name.toUpperCase(),
        fontSize: 28,
        fontWeight: 700,
        color: "#171717",
      },
    },
    {
      type: "button",
      frame: { x: 16, y: 240, w: 180, h: 48 },
      props: {
        text: "Agendar",
        href: "book",
        backgroundColor: "#171717",
        color: "#fafafa",
        borderRadius: 0,
        fontWeight: 700,
      },
    },
    {
      type: "rect",
      frame: { x: 0, y: 320, w: 390, h: 48 },
      props: { backgroundColor: "#ef4444", borderRadius: 0 },
    },
    {
      type: "rect",
      frame: { x: 0, y: 368, w: 390, h: 48 },
      props: { backgroundColor: "#3b82f6", borderRadius: 0 },
    },
    {
      type: "rect",
      frame: { x: 0, y: 416, w: 390, h: 48 },
      props: { backgroundColor: "#3b82f6", borderRadius: 0 },
    },
    {
      type: "services",
      frame: { x: 16, y: 490, w: 358, h: 500 },
      props: { title: "Serviços", gridCols: 1 },
    },
    {
      type: "footer",
      frame: { x: 0, y: 1040, w: 390, h: 80 },
      props: { showPitch: false },
    },
  ]);
  return board(theme, 1780, 1180, [...desk, ...mob]);
}

/** Contato/mapa à esquerda; nome/CTA à direita; serviços depois. */
function ruaTemplate(name: string): SiteCanvasConfig {
  const theme: CanvasTheme = {
    primary: "#84cc16",
    secondary: "#a3a3a3",
    background: "#171717",
    surface: "#262626",
    text: "#fafafa",
    fontDisplay: "inherit",
    fontBody: "var(--font-geist-sans), system-ui, sans-serif",
    radius: "md",
    motion: "subtle",
  };
  const desk = free("desktop", "rua", [
    { type: "navbar", frame: { x: 0, y: 0, w: 1440, h: 56 }, zIndex: 40 },
    {
      type: "contact",
      frame: { x: 48, y: 80, w: 680, h: 420 },
      props: { title: "Onde estamos" },
    },
    {
      type: "media",
      frame: { x: 48, y: 520, w: 680, h: 280 },
      props: { backgroundColor: "#404040", borderRadius: 12 },
    },
    {
      type: "badge",
      frame: { x: 800, y: 100, w: 140, h: 28 },
      props: {
        text: "NO BAIRRO",
        backgroundColor: "#84cc16",
        color: "#14532d",
        borderRadius: 4,
        fontWeight: 700,
        fontSize: 11,
      },
    },
    {
      type: "text",
      frame: { x: 800, y: 150, w: 560, h: 120 },
      props: {
        text: `${name}\nperto de você`,
        variant: "display",
        fontSize: 44,
        fontWeight: 700,
        color: "#fafafa",
      },
    },
    {
      type: "text",
      frame: { x: 800, y: 300, w: 520, h: 56 },
      props: {
        text: "Começa pelo endereço. Agenda depois.",
        fontSize: 17,
        color: "#a3a3a3",
      },
    },
    {
      type: "button",
      frame: { x: 800, y: 390, w: 220, h: 52 },
      props: {
        text: "Agendar",
        href: "book",
        backgroundColor: "#84cc16",
        color: "#14532d",
        borderRadius: 8,
        fontWeight: 700,
      },
    },
    {
      type: "panel",
      frame: { x: 800, y: 480, w: 560, h: 200 },
      props: {
        title: "Horário de rua",
        description: "Seg–Sáb movimentado. Dom consulta. Venha sem frescura.",
        variant: "flat",
        backgroundColor: "#262626",
        borderColor: "#404040",
        borderRadius: 12,
        padding: 24,
        color: "#fafafa",
      },
    },
    {
      type: "services",
      frame: { x: 48, y: 860, w: 1344, h: 380 },
      props: { title: "O que a gente faz", gridCols: 3 },
    },
    {
      type: "team",
      frame: { x: 48, y: 1280, w: 1344, h: 300 },
      props: { title: "Quem corta", gridCols: 3 },
    },
    {
      type: "footer",
      frame: { x: 0, y: 1640, w: 1440, h: 90 },
      props: { showPitch: true },
    },
  ]);
  const mob = free("mobile", "rua", [
    { type: "navbar", frame: { x: 0, y: 0, w: 390, h: 52 }, zIndex: 40 },
    {
      type: "badge",
      frame: { x: 16, y: 70, w: 120, h: 28 },
      props: {
        text: "NO BAIRRO",
        backgroundColor: "#84cc16",
        color: "#14532d",
        borderRadius: 4,
        fontWeight: 700,
      },
    },
    {
      type: "contact",
      frame: { x: 16, y: 120, w: 358, h: 300 },
      props: { title: "Onde estamos" },
    },
    {
      type: "text",
      frame: { x: 16, y: 440, w: 358, h: 70 },
      props: {
        text: `${name}\nperto de você`,
        fontSize: 26,
        fontWeight: 700,
        color: "#fafafa",
      },
    },
    {
      type: "button",
      frame: { x: 16, y: 540, w: 200, h: 48 },
      props: {
        text: "Agendar",
        href: "book",
        backgroundColor: "#84cc16",
        color: "#14532d",
        borderRadius: 8,
        fontWeight: 700,
      },
    },
    {
      type: "services",
      frame: { x: 16, y: 620, w: 358, h: 480 },
      props: { title: "Serviços", gridCols: 1 },
    },
    {
      type: "footer",
      frame: { x: 0, y: 1140, w: 390, h: 80 },
      props: { showPitch: true },
    },
  ]);
  return board(theme, 1780, 1280, [...desk, ...mob]);
}

/**
 * Vitrine demonstrativa Barbergon — surpreende com identidade visual:
 * foto real, split tipográfico, galeria, preview do editor, seções vivas.
 * Editável em /admin/site (mesmo canvas do cliente).
 */
function vitrineTemplate(name: string): SiteCanvasConfig {
  const HERO_IMG = "/images/landing/hero-barbershop.png";
  const BUILDER_IMG = "/images/landing/builder-preview.png";

  const theme: CanvasTheme = {
    primary: "#3b82f6",
    secondary: "#94a3b8",
    background: "#07080c",
    surface: "#111318",
    text: "#f1f5f9",
    bgArt: "noise",
    bgArtColor: "#1e293b",
    bgArtStrength: 18,
    fontDisplay:
      "var(--font-display), var(--font-geist-sans), system-ui, sans-serif",
    fontBody: "var(--font-geist-sans), system-ui, sans-serif",
    radius: "md",
    motion: "full",
  };

  const desk = free("desktop", "vitrine", [
    { type: "navbar", frame: { x: 0, y: 0, w: 1440, h: 64 }, zIndex: 60 },
    /* Split cinematográfico: foto dominante + coluna de marca */
    {
      type: "media",
      frame: { x: 0, y: 64, w: 860, h: 640 },
      props: {
        mediaUrl: HERO_IMG,
        mediaZoom: 1.15,
        mediaPosX: 42,
        mediaPosY: 35,
        borderRadius: 0,
        backgroundColor: "#0f172a",
      },
      zIndex: 2,
    },
    {
      type: "rect",
      frame: { x: 860, y: 64, w: 580, h: 640 },
      props: { backgroundColor: "#0c1018", borderRadius: 0 },
      zIndex: 1,
    },
    {
      type: "badge",
      frame: { x: 900, y: 120, w: 200, h: 32 },
      props: {
        text: "DEMO · EDITOR VISUAL",
        backgroundColor: "#3b82f6",
        color: "#020617",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
      },
      zIndex: 10,
    },
    {
      type: "text",
      frame: { x: 900, y: 180, w: 480, h: 140 },
      props: {
        text: name.toUpperCase(),
        variant: "display",
        fontSize: 64,
        fontWeight: 700,
        color: "#f8fafc",
        align: "left",
      },
      zIndex: 10,
    },
    {
      type: "text",
      frame: { x: 900, y: 340, w: 460, h: 100 },
      props: {
        text: "Sua barbearia com cara própria — cores, tipografia, fotos e agenda no mesmo canvas que você edita em minutos.",
        variant: "body",
        fontSize: 17,
        fontWeight: 400,
        color: "#94a3b8",
        align: "left",
      },
      zIndex: 10,
    },
    {
      type: "button",
      frame: { x: 900, y: 470, w: 220, h: 52 },
      props: {
        text: "Agendar horário",
        href: "book",
        backgroundColor: "#3b82f6",
        color: "#020617",
        borderRadius: 999,
        fontWeight: 700,
        fontSize: 15,
      },
      zIndex: 10,
    },
    {
      type: "button",
      frame: { x: 1140, y: 470, w: 200, h: 52 },
      props: {
        text: "Ver serviços ↓",
        href: "#",
        backgroundColor: "transparent",
        color: "#e2e8f0",
        borderColor: "#334155",
        borderWidth: 1,
        borderRadius: 999,
        fontWeight: 600,
        fontSize: 14,
      },
      zIndex: 10,
    },
    {
      type: "text",
      frame: { x: 900, y: 560, w: 460, h: 72 },
      props: {
        text: "Arraste, troque a foto, mude a tipografia — o cliente vê a marca, não um template genérico.",
        variant: "caption",
        fontSize: 13,
        color: "#64748b",
      },
      zIndex: 10,
    },
    /* Faixa de impacto tipográfico */
    {
      type: "rect",
      frame: { x: 0, y: 704, w: 1440, h: 120 },
      props: { backgroundColor: "#3b82f6", borderRadius: 0 },
      zIndex: 1,
    },
    {
      type: "text",
      frame: { x: 64, y: 728, w: 1100, h: 72 },
      props: {
        text: "IDENTIDADE QUE PARECE DE MARCA — NÃO DE PLANILHA.",
        variant: "title",
        fontSize: 28,
        fontWeight: 700,
        color: "#020617",
      },
      zIndex: 5,
    },
    /* Galeria: prova de mídia + enquadramento */
    {
      type: "text",
      frame: { x: 64, y: 860, w: 600, h: 40 },
      props: {
        text: "Atmosfera na primeira dobra",
        variant: "title",
        fontSize: 22,
        fontWeight: 700,
        color: "#f1f5f9",
      },
    },
    {
      type: "media",
      frame: { x: 64, y: 920, w: 520, h: 300 },
      props: {
        mediaUrl: HERO_IMG,
        mediaZoom: 1.4,
        mediaPosX: 60,
        mediaPosY: 40,
        borderRadius: 16,
        backgroundColor: "#1e293b",
      },
    },
    {
      type: "media",
      frame: { x: 608, y: 920, w: 360, h: 300 },
      props: {
        mediaUrl: HERO_IMG,
        mediaZoom: 1.8,
        mediaPosX: 30,
        mediaPosY: 20,
        borderRadius: 16,
        backgroundColor: "#1e293b",
      },
    },
    {
      type: "panel",
      frame: { x: 992, y: 920, w: 384, h: 300 },
      props: {
        title: "Zoom & crop no canvas",
        description:
          "Cada foto tem enquadramento próprio. No celular o cliente vê a mesma força visual.",
        backgroundColor: "#111318",
        borderColor: "#334155",
        borderRadius: 16,
        padding: 28,
        color: "#e2e8f0",
        variant: "flat",
      },
    },
    /* Prova do editor */
    {
      type: "text",
      frame: { x: 64, y: 1270, w: 700, h: 48 },
      props: {
        text: "O mesmo editor que você usa no painel",
        variant: "title",
        fontSize: 26,
        fontWeight: 700,
        color: "#f1f5f9",
      },
    },
    {
      type: "text",
      frame: { x: 64, y: 1328, w: 560, h: 80 },
      props: {
        text: "Desktop e celular lado a lado. Publique e o site da barbearia atualiza — white-label de verdade.",
        fontSize: 16,
        color: "#94a3b8",
      },
    },
    {
      type: "media",
      frame: { x: 640, y: 1270, w: 736, h: 420 },
      props: {
        mediaUrl: BUILDER_IMG,
        mediaZoom: 1.05,
        mediaPosX: 50,
        mediaPosY: 45,
        borderRadius: 20,
        backgroundColor: "#0f172a",
        borderColor: "#334155",
        borderWidth: 1,
      },
    },
    {
      type: "badge",
      frame: { x: 64, y: 1440, w: 160, h: 32 },
      props: {
        text: "/admin/site",
        backgroundColor: "#1e293b",
        color: "#93c5fd",
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 700,
      },
    },
    {
      type: "button",
      frame: { x: 64, y: 1520, w: 280, h: 52 },
      props: {
        text: "Criar minha barbearia",
        href: "/cadastro",
        backgroundColor: "#f8fafc",
        color: "#020617",
        borderRadius: 999,
        fontWeight: 700,
      },
    },
    /* Pull quote */
    {
      type: "rect",
      frame: { x: 0, y: 1740, w: 1440, h: 200 },
      props: { backgroundColor: "#0c1018", borderRadius: 0 },
    },
    {
      type: "text",
      frame: { x: 120, y: 1780, w: 1200, h: 120 },
      props: {
        text: "“Não é um site genérico. É a cara do seu salão — e o cliente agenda sem baixar app.”",
        variant: "display",
        fontSize: 32,
        fontWeight: 400,
        color: "#e2e8f0",
        align: "center",
      },
    },
    /* Serviços reais */
    {
      type: "services",
      frame: { x: 64, y: 1980, w: 1312, h: 380 },
      props: { title: "Carta de serviços", gridCols: 3 },
    },
    {
      type: "team",
      frame: { x: 64, y: 2400, w: 640, h: 300 },
      props: { title: "Quem atende", gridCols: 2 },
    },
    {
      type: "contact",
      frame: { x: 736, y: 2400, w: 640, h: 300 },
      props: { title: "Venha conhecer" },
    },
    {
      type: "footer",
      frame: { x: 0, y: 2740, w: 1440, h: 100 },
      props: { showPitch: true },
    },
  ]);

  const mob = free("mobile", "vitrine", [
    { type: "navbar", frame: { x: 0, y: 0, w: 390, h: 56 }, zIndex: 60 },
    {
      type: "media",
      frame: { x: 0, y: 56, w: 390, h: 320 },
      props: {
        mediaUrl: HERO_IMG,
        mediaZoom: 1.2,
        mediaPosX: 45,
        mediaPosY: 30,
        borderRadius: 0,
        backgroundColor: "#0f172a",
      },
    },
    {
      type: "badge",
      frame: { x: 16, y: 392, w: 180, h: 28 },
      props: {
        text: "DEMO · EDITOR",
        backgroundColor: "#3b82f6",
        color: "#020617",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
      },
    },
    {
      type: "text",
      frame: { x: 16, y: 436, w: 358, h: 72 },
      props: {
        text: name.toUpperCase(),
        variant: "display",
        fontSize: 36,
        fontWeight: 700,
        color: "#f8fafc",
      },
    },
    {
      type: "text",
      frame: { x: 16, y: 516, w: 358, h: 72 },
      props: {
        text: "Marca própria, agenda no celular, editável no painel.",
        fontSize: 14,
        color: "#94a3b8",
      },
    },
    {
      type: "button",
      frame: { x: 16, y: 600, w: 358, h: 48 },
      props: {
        text: "Agendar horário",
        href: "book",
        backgroundColor: "#3b82f6",
        color: "#020617",
        borderRadius: 999,
        fontWeight: 700,
      },
    },
    {
      type: "rect",
      frame: { x: 0, y: 672, w: 390, h: 88 },
      props: { backgroundColor: "#3b82f6", borderRadius: 0 },
    },
    {
      type: "text",
      frame: { x: 16, y: 692, w: 358, h: 52 },
      props: {
        text: "IDENTIDADE DE MARCA — NÃO TEMPLATE GENÉRICO.",
        fontSize: 14,
        fontWeight: 700,
        color: "#020617",
      },
    },
    {
      type: "media",
      frame: { x: 16, y: 784, w: 358, h: 200 },
      props: {
        mediaUrl: HERO_IMG,
        mediaZoom: 1.5,
        mediaPosX: 55,
        borderRadius: 12,
      },
    },
    {
      type: "media",
      frame: { x: 16, y: 1000, w: 358, h: 200 },
      props: {
        mediaUrl: BUILDER_IMG,
        mediaZoom: 1.1,
        borderRadius: 12,
      },
    },
    {
      type: "text",
      frame: { x: 16, y: 1220, w: 358, h: 64 },
      props: {
        text: "Preview do builder — o que você monta no /admin/site.",
        fontSize: 14,
        color: "#94a3b8",
      },
    },
    {
      type: "button",
      frame: { x: 16, y: 1300, w: 358, h: 48 },
      props: {
        text: "Criar minha barbearia",
        href: "/cadastro",
        backgroundColor: "#f8fafc",
        color: "#020617",
        borderRadius: 999,
        fontWeight: 700,
      },
    },
    {
      type: "services",
      frame: { x: 16, y: 1380, w: 358, h: 480 },
      props: { title: "Serviços", gridCols: 1 },
    },
    {
      type: "team",
      frame: { x: 16, y: 1890, w: 358, h: 240 },
      props: { title: "Equipe", gridCols: 1 },
    },
    {
      type: "contact",
      frame: { x: 16, y: 2150, w: 358, h: 220 },
      props: { title: "Contato" },
    },
    {
      type: "footer",
      frame: { x: 0, y: 2400, w: 390, h: 80 },
      props: { showPitch: true },
    },
  ]);

  return board(theme, 2900, 2540, [...desk, ...mob]);
}

/** Modelos de página completa (desktop + mobile) com layouts distintos. */
export function buildCanvasPageTemplate(
  id: CanvasPageTemplateId,
  shopName: string,
): SiteCanvasConfig {
  const name = shopName.trim() || "Sua barbearia";
  switch (id) {
    case "blank":
      return blankTemplate(name);
    case "classic":
      return classicTemplate(name);
    case "studio":
      return studioTemplate(name);
    case "minimal":
      return minimalTemplate(name);
    case "moderno":
      return modernoTemplate(name);
    case "editorial":
      return editorialTemplate(name);
    case "impacto":
      return impactoTemplate(name);
    case "noir":
      return noirTemplate(name);
    case "neon":
      return neonTemplate(name);
    case "brutalista":
      return brutalistaTemplate(name);
    case "ocean":
      return oceanTemplate(name);
    case "boutique":
      return boutiqueTemplate(name);
    case "bauhaus":
      return bauhausTemplate(name);
    case "rua":
      return ruaTemplate(name);
    case "vitrine":
      return vitrineTemplate(name);
    default: {
      const _e: never = id;
      void _e;
      return classicTemplate(name);
    }
  }
}

import { z } from "zod";

import {
  buildCanvasPageTemplate,
  type CanvasPageTemplateId,
} from "@/lib/canvas-page-templates";
import {
  parseSitePageConfig,
  type SitePageConfig,
  type SiteTheme,
} from "@/lib/site-page";

export {
  CANVAS_PAGE_TEMPLATE_IDS,
  PAGE_TEMPLATE_META,
  buildCanvasPageTemplate,
} from "@/lib/canvas-page-templates";

export const CANVAS_ARTBOARDS = ["desktop", "mobile"] as const;
export type CanvasArtboardId = (typeof CANVAS_ARTBOARDS)[number];

export const CANVAS_ELEMENT_TYPES = [
  "text",
  "image",
  "button",
  "rect",
  "media",
  "navbar",
  "services",
  "team",
  "contact",
  "footer",
  "hero",
  "panel",
  "grid",
  "divider",
  "badge",
  "spacer",
] as const;

export type CanvasElementType = (typeof CANVAS_ELEMENT_TYPES)[number];

export const DESKTOP_ARTBOARD = { width: 1440, height: 2400 } as const;
export const MOBILE_ARTBOARD = { width: 390, height: 3200 } as const;

const themeSchema = z.object({
  primary: z.string().trim().min(3).max(16).optional(),
  secondary: z.string().trim().min(3).max(16).optional(),
  background: z.string().trim().min(3).max(16).optional(),
  surface: z.string().trim().min(3).max(16).optional(),
  text: z.string().trim().min(3).max(16).optional(),
  /** Arte de fundo: none | grid | dots | diagonal | horizon | glow | noise | checker */
  bgArt: z
    .enum([
      "none",
      "grid",
      "dots",
      "diagonal",
      "horizon",
      "vertical",
      "glow",
      "noise",
      "checker",
      "blueprint",
      "cross",
      "rings",
      "waves",
      "spark",
      "mesh",
    ])
    .optional(),
  /** Cor das linhas / tinta do padrão (hex). */
  bgArtColor: z.string().trim().min(3).max(16).optional(),
  /** Intensidade do padrão 5–100. */
  bgArtStrength: z.number().min(5).max(100).optional(),
  fontDisplay: z.string().trim().max(80).optional(),
  fontBody: z.string().trim().max(80).optional(),
  radius: z.enum(["sm", "md", "lg"]).optional(),
  motion: z.enum(["off", "subtle", "full"]).optional(),
});

const frameSchema = z.object({
  x: z.number().min(-2000).max(8000),
  y: z.number().min(-2000).max(12000),
  /** Barras neon / divisores podem ser finos */
  w: z.number().min(4).max(4000),
  h: z.number().min(1).max(4000),
});

const cardItemSchema = z.object({
  title: z.string().max(80),
  description: z.string().max(240).optional(),
  emoji: z.string().max(8).optional(),
});

const elementPropsSchema = z
  .object({
    text: z.string().max(4000).optional(),
    fontSize: z.number().min(10).max(200).optional(),
    fontWeight: z.union([z.literal(400), z.literal(600), z.literal(700)]).optional(),
    color: z.string().max(32).optional(),
    backgroundColor: z.string().max(32).optional(),
    borderColor: z.string().max(32).optional(),
    borderWidth: z.number().min(0).max(12).optional(),
    borderRadius: z.number().min(0).max(999).optional(),
    align: z.enum(["left", "center", "right"]).optional(),
    href: z.string().max(300).optional(),
    mediaUrl: z.string().max(800).optional(),
    /** Zoom da foto dentro do quadro (1 = 100%, até 3 = 300%). */
    mediaZoom: z.number().min(1).max(3).optional(),
    /** Posição horizontal do enquadramento (0–100). */
    mediaPosX: z.number().min(0).max(100).optional(),
    /** Posição vertical do enquadramento (0–100). */
    mediaPosY: z.number().min(0).max(100).optional(),
    opacity: z.number().min(0).max(1).optional(),
    showPitch: z.boolean().optional(),
    schedule: z
      .array(z.object({ label: z.string().max(40), range: z.string().max(40) }))
      .max(14)
      .optional(),
    title: z.string().max(160).optional(),
    description: z.string().max(500).optional(),
    eyebrow: z.string().max(80).optional(),
    ctaLabel: z.string().max(60).optional(),
    overlay: z.number().min(0).max(1).optional(),
    padding: z.number().min(0).max(80).optional(),
    thickness: z.number().min(1).max(24).optional(),
    variant: z.string().max(40).optional(),
    gridCols: z
      .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])
      .optional(),
    cards: z.array(cardItemSchema).max(12).optional(),
  })
  .passthrough();

export const canvasElementSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.enum(CANVAS_ELEMENT_TYPES),
  artboard: z.enum(CANVAS_ARTBOARDS),
  frame: frameSchema,
  zIndex: z.number().int().min(0).max(999).default(1),
  locked: z.boolean().optional(),
  hidden: z.boolean().optional(),
  props: elementPropsSchema.optional(),
});

export const siteCanvasSchema = z.object({
  version: z.literal(2),
  theme: themeSchema.optional(),
  artboards: z.object({
    desktop: z.object({
      width: z.number().int().min(320).max(2400),
      height: z.number().int().min(400).max(12000),
    }),
    mobile: z.object({
      width: z.number().int().min(280).max(900),
      height: z.number().int().min(400).max(12000),
    }),
  }),
  elements: z.array(canvasElementSchema).max(200),
});

export type SiteCanvasConfig = z.infer<typeof siteCanvasSchema>;
export type CanvasElement = z.infer<typeof canvasElementSchema>;
export type CanvasTheme = z.infer<typeof themeSchema>;

export type CanvasTemplateId = CanvasPageTemplateId;

function el(
  partial: Omit<CanvasElement, "zIndex"> & { zIndex?: number },
): CanvasElement {
  return { zIndex: 1, ...partial };
}

function stackOnArtboard(
  artboard: CanvasArtboardId,
  boardW: number,
  items: Array<{
    type: CanvasElementType;
    h: number;
    props?: CanvasElement["props"];
    padX?: number;
  }>,
  startY = 24,
  gap = 28,
): CanvasElement[] {
  let y = startY;
  const out: CanvasElement[] = [];
  items.forEach((item, i) => {
    const padX = item.padX ?? 48;
    const w = Math.max(120, boardW - padX * 2);
    out.push(
      el({
        id: `${artboard}-${item.type}-${i}`,
        type: item.type,
        artboard,
        frame: { x: padX, y, w, h: item.h },
        zIndex: i + 1,
        props: item.props,
      }),
    );
    y += item.h + gap;
  });
  return out;
}

/** Templates de página completa — ver canvas-page-templates.ts */
export function getCanvasTemplate(
  id: CanvasPageTemplateId,
  shopName: string,
): SiteCanvasConfig {
  return buildCanvasPageTemplate(id, shopName);
}

/** Converte siteJson v1 (seções) em canvas v2 empilhado. */
export function migrateSitePageToCanvas(
  page: SitePageConfig,
  shopName: string,
): SiteCanvasConfig {
  const name = shopName.trim() || "Sua barbearia";
  const deskW = DESKTOP_ARTBOARD.width;
  const items: Array<{
    type: CanvasElementType;
    h: number;
    props?: CanvasElement["props"];
  }> = [];

  for (const s of [...page.sections].sort((a, b) => a.order - b.order)) {
    if (!s.visible) continue;
    const p = s.props ?? {};
    switch (s.type) {
      case "navbar":
        items.push({ type: "navbar", h: 72 });
        break;
      case "hero":
        items.push({
          type: "text",
          h: 88,
          props: {
            text: p.title?.trim() || name,
            fontSize: 56,
            fontWeight: 700,
            color: "#fafafa",
          },
        });
        if (p.description) {
          items.push({
            type: "text",
            h: 48,
            props: { text: p.description, fontSize: 20, color: "#a8a29e" },
          });
        }
        items.push({
          type: "button",
          h: 52,
          props: {
            text: p.ctaLabel?.trim() || "Agendar",
            href: p.ctaHref?.trim() || "book",
            backgroundColor: page.theme?.primary || "#3b82f6",
            color: "#09090b",
            borderRadius: 999,
            fontWeight: 700,
          },
        });
        break;
      case "services":
        items.push({
          type: "services",
          h: 400,
          props: {
            eyebrow: p.eyebrow,
            title: p.title,
            description: p.description,
            gridCols: p.gridCols ?? 3,
          },
        });
        break;
      case "team":
        items.push({
          type: "team",
          h: 360,
          props: {
            title: p.title,
            description: p.description,
            gridCols: p.gridCols ?? 3,
          },
        });
        break;
      case "about":
      case "richText":
        items.push({
          type: "text",
          h: 160,
          props: {
            text: [p.title, p.description, p.body].filter(Boolean).join("\n\n") || name,
            fontSize: 18,
            color: "#d4d4d8",
          },
        });
        break;
      case "contact":
        items.push({
          type: "contact",
          h: 360,
          props: {
            title: p.title,
            description: p.description,
            schedule: p.schedule,
          },
        });
        break;
      case "cta":
        items.push({
          type: "button",
          h: 56,
          props: {
            text: p.ctaLabel || p.title || "Agendar",
            href: p.ctaHref || "book",
            backgroundColor: page.theme?.primary || "#3b82f6",
            color: "#09090b",
            borderRadius: 999,
            fontWeight: 700,
          },
        });
        break;
      case "footer":
        items.push({
          type: "footer",
          h: 120,
          props: { showPitch: p.showPitch !== false },
        });
        break;
      default: {
        const _exhaustive: never = s.type;
        void _exhaustive;
        break;
      }
    }
  }

  if (items.length === 0) {
    return getCanvasTemplate("classic", name);
  }

  const desk = stackOnArtboard("desktop", deskW, items);
  const last = desk[desk.length - 1];
  const deskH = Math.max(
    DESKTOP_ARTBOARD.height,
    (last?.frame.y ?? 0) + (last?.frame.h ?? 0) + 80,
  );

  const scale = MOBILE_ARTBOARD.width / deskW;
  const mob = desk.map((e, i) =>
    el({
      id: `mobile-from-${e.id}`,
      type: e.type,
      artboard: "mobile",
      frame: {
        x: Math.round(e.frame.x * scale),
        y: Math.round(e.frame.y * scale),
        w: Math.max(24, Math.round(e.frame.w * scale)),
        h: Math.max(24, Math.round(e.frame.h * scale)),
      },
      zIndex: i + 1,
      props: e.props,
    }),
  );
  const mLast = mob[mob.length - 1];
  const mobH = Math.max(
    MOBILE_ARTBOARD.height,
    (mLast?.frame.y ?? 0) + (mLast?.frame.h ?? 0) + 64,
  );

  return {
    version: 2,
    theme: page.theme,
    artboards: {
      desktop: { width: deskW, height: deskH },
      mobile: { width: MOBILE_ARTBOARD.width, height: mobH },
    },
    elements: [...desk, ...mob],
  };
}

export function parseSiteCanvasConfig(
  raw: unknown,
  shopName: string,
): SiteCanvasConfig {
  const v2 = siteCanvasSchema.safeParse(raw);
  if (v2.success) {
    return v2.data;
  }

  // Recuperação: canvas v2 salvo com props fora do schema antigo
  // (ex.: borderRadius 999, divisores finos) — normaliza e tenta de novo.
  if (
    raw &&
    typeof raw === "object" &&
    (raw as { version?: unknown }).version === 2 &&
    Array.isArray((raw as { elements?: unknown }).elements)
  ) {
    const soft = structuredClone(raw) as {
      version: 2;
      theme?: SiteCanvasConfig["theme"];
      artboards: SiteCanvasConfig["artboards"];
      elements: Array<{
        frame: { x: number; y: number; w: number; h: number };
        props?: Record<string, unknown>;
        [k: string]: unknown;
      }>;
    };
    for (const el of soft.elements) {
      el.frame.w = Math.max(4, el.frame.w);
      el.frame.h = Math.max(1, el.frame.h);
      if (typeof el.props?.borderRadius === "number") {
        el.props.borderRadius = Math.min(999, Math.max(0, el.props.borderRadius));
      }
    }
    const again = siteCanvasSchema.safeParse(soft);
    if (again.success) return again.data;
  }

  // v1 sections → canvas
  if (
    raw &&
    typeof raw === "object" &&
    "sections" in (raw as object) &&
    Array.isArray((raw as { sections?: unknown }).sections)
  ) {
    const page = parseSitePageConfig(raw, shopName);
    return migrateSitePageToCanvas(page, shopName);
  }

  return getCanvasTemplate("classic", shopName);
}

export function elementsForArtboard(
  config: SiteCanvasConfig,
  artboard: CanvasArtboardId,
): CanvasElement[] {
  return config.elements
    .filter((e) => e.artboard === artboard && !e.hidden)
    .sort((a, b) => a.zIndex - b.zIndex || a.frame.y - b.frame.y);
}

export function copyDesktopToMobile(
  config: SiteCanvasConfig,
): SiteCanvasConfig {
  const deskW = config.artboards.desktop.width;
  const mobW = config.artboards.mobile.width;
  const scale = mobW / deskW;
  const desktopEls = config.elements.filter((e) => e.artboard === "desktop");
  const others = config.elements.filter((e) => e.artboard !== "mobile");
  const mobileEls = desktopEls.map((e, i) =>
    el({
      id: `m-copy-${e.id}-${i}`,
      type: e.type,
      artboard: "mobile",
      frame: {
        x: Math.round(e.frame.x * scale),
        y: Math.round(e.frame.y * scale),
        w: Math.max(24, Math.round(e.frame.w * scale)),
        h: Math.max(24, Math.round(e.frame.h * scale)),
      },
      zIndex: e.zIndex,
      locked: e.locked,
      props: e.props,
    }),
  );
  const mLast = mobileEls[mobileEls.length - 1];
  const mobH = Math.max(
    config.artboards.mobile.height,
    (mLast?.frame.y ?? 0) + (mLast?.frame.h ?? 0) + 64,
  );
  return {
    ...config,
    artboards: {
      ...config.artboards,
      mobile: { ...config.artboards.mobile, height: mobH },
    },
    elements: [...others, ...mobileEls],
  };
}

export function createLibraryElement(
  type: CanvasElementType,
  artboard: CanvasArtboardId,
  boardW: number,
  atY = 80,
): CanvasElement {
  const pad = artboard === "mobile" ? 16 : 48;
  const w = Math.min(boardW - pad * 2, artboard === "mobile" ? 358 : 720);
  const fullW = boardW - pad * 2;
  const id = `${type}-${Date.now().toString(36)}`;
  const base = { id, type, artboard, zIndex: 50 } as const;

  switch (type) {
    case "text":
      return el({
        ...base,
        frame: { x: pad, y: atY, w, h: 64 },
        props: {
          text: "Novo texto",
          fontSize: artboard === "mobile" ? 24 : 32,
          fontWeight: 600,
          color: "#fafafa",
        },
      });
    case "button":
      return el({
        ...base,
        frame: { x: pad, y: atY, w: 180, h: 48 },
        props: {
          text: "Botão",
          href: "book",
          backgroundColor: "#3b82f6",
          color: "#09090b",
          borderRadius: 999,
          fontWeight: 700,
        },
      });
    case "image":
    case "media":
      return el({
        ...base,
        frame: { x: pad, y: atY, w, h: 220 },
        props: { backgroundColor: "#27272a" },
      });
    case "rect":
      return el({
        ...base,
        frame: { x: pad, y: atY, w: fullW, h: 180 },
        props: {
          backgroundColor: "theme.primary",
          borderColor: "transparent",
          borderRadius: 20,
        },
      });
    case "navbar":
      return el({
        ...base,
        frame: { x: 0, y: 0, w: boardW, h: artboard === "mobile" ? 64 : 72 },
        props: {},
      });
    case "services":
      return el({
        ...base,
        frame: { x: pad, y: atY, w: fullW, h: artboard === "mobile" ? 480 : 360 },
        props: { title: "Serviços", gridCols: artboard === "mobile" ? 1 : 3 },
      });
    case "team":
      return el({
        ...base,
        frame: { x: pad, y: atY, w: fullW, h: artboard === "mobile" ? 400 : 320 },
        props: { title: "Equipe", gridCols: artboard === "mobile" ? 1 : 3 },
      });
    case "contact":
      return el({
        ...base,
        frame: { x: pad, y: atY, w: fullW, h: 320 },
        props: { title: "Contato" },
      });
    case "footer":
      return el({
        ...base,
        frame: { x: 0, y: atY, w: boardW, h: 100 },
        props: { showPitch: true },
      });
    case "hero":
      return el({
        ...base,
        frame: {
          x: 0,
          y: atY,
          w: boardW,
          h: artboard === "mobile" ? 420 : 520,
        },
        props: {
          eyebrow: "Sua barbearia",
          title: "Estilo e presença",
          description: "Agende online com a cara da sua marca.",
          ctaLabel: "Agendar",
          href: "book",
          backgroundColor: "#14110e",
          overlay: 0.45,
          color: "#fafafa",
        },
      });
    case "panel":
      return el({
        ...base,
        frame: { x: pad, y: atY, w: Math.min(fullW, 480), h: 200 },
        props: {
          title: "Painel em destaque",
          description: "Use painéis para destacar ofertas, avisos ou diferenciais.",
          backgroundColor: "#18181b",
          borderColor: "#3f3f46",
          borderRadius: 20,
          padding: 24,
          color: "#fafafa",
        },
      });
    case "grid":
      return el({
        ...base,
        frame: {
          x: pad,
          y: atY,
          w: fullW,
          h: artboard === "mobile" ? 520 : 280,
        },
        props: {
          title: "Destaques",
          gridCols: artboard === "mobile" ? 1 : 3,
          cards: [
            {
              title: "Agenda fácil",
              description: "Cliente escolhe dia e hora no site.",
              emoji: "⏱",
            },
            {
              title: "Sua marca",
              description: "Cores, textos e layout sob o seu controle.",
              emoji: "✦",
            },
            {
              title: "Equipe",
              description: "Mostre quem atende e gere confiança.",
              emoji: "✂",
            },
          ],
          backgroundColor: "transparent",
          color: "#fafafa",
        },
      });
    case "divider":
      return el({
        ...base,
        frame: { x: pad, y: atY, w: fullW, h: 24 },
        props: { color: "#3f3f46", thickness: 1 },
      });
    case "badge":
      return el({
        ...base,
        frame: { x: pad, y: atY, w: 160, h: 36 },
        props: {
          text: "Novidade",
          backgroundColor: "#3b82f6",
          color: "#09090b",
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 700,
          align: "center",
        },
      });
    case "spacer":
      return el({
        ...base,
        frame: { x: pad, y: atY, w: fullW, h: 64 },
        props: { backgroundColor: "transparent" },
      });
    default: {
      const _e: never = type;
      void _e;
      return el({
        ...base,
        type: "text",
        frame: { x: pad, y: atY, w, h: 48 },
        props: { text: "Elemento", color: "#fafafa" },
      });
    }
  }
}

/** Alias usado no cadastro / API de templates. */
export function getSiteTemplate(
  id: CanvasTemplateId,
  shopName: string,
): SiteCanvasConfig {
  return getCanvasTemplate(id, shopName);
}

export type { SiteTheme };

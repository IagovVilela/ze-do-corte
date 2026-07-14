import { z } from "zod";

export const SITE_SECTION_TYPES = [
  "navbar",
  "hero",
  "services",
  "team",
  "about",
  "contact",
  "footer",
  "richText",
  "cta",
] as const;

export type SiteSectionType = (typeof SITE_SECTION_TYPES)[number];

export const SITE_MOTION_LEVELS = ["off", "subtle", "full"] as const;
export type SiteMotionLevel = (typeof SITE_MOTION_LEVELS)[number];

export const SITE_GRID_COLS = [1, 2, 3] as const;

const themeSchema = z.object({
  primary: z.string().trim().min(3).max(16).optional(),
  secondary: z.string().trim().min(3).max(16).optional(),
  background: z.string().trim().min(3).max(16).optional(),
  surface: z.string().trim().min(3).max(16).optional(),
  text: z.string().trim().min(3).max(16).optional(),
  fontDisplay: z.string().trim().max(80).optional(),
  fontBody: z.string().trim().max(80).optional(),
  radius: z.enum(["sm", "md", "lg"]).optional(),
  motion: z.enum(SITE_MOTION_LEVELS).optional(),
});

const sectionSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.enum(SITE_SECTION_TYPES),
  visible: z.boolean().default(true),
  order: z.number().int().min(0).max(100),
  variant: z.string().trim().max(40).optional(),
  props: z
    .object({
      eyebrow: z.string().max(80).optional(),
      title: z.string().max(160).optional(),
      description: z.string().max(500).optional(),
      body: z.string().max(4000).optional(),
      ctaLabel: z.string().max(60).optional(),
      ctaHref: z.string().max(200).optional(),
      gridCols: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
      align: z.enum(["left", "center", "right"]).optional(),
      mediaUrl: z.string().max(500).optional(),
      showPitch: z.boolean().optional(),
      schedule: z
        .array(
          z.object({
            label: z.string().max(40),
            range: z.string().max(40),
          }),
        )
        .max(14)
        .optional(),
    })
    .passthrough()
    .optional(),
});

export const sitePageSchema = z.object({
  version: z.literal(1).default(1),
  theme: themeSchema.optional(),
  layout: z
    .object({
      density: z.enum(["compact", "comfortable", "spacious"]).optional(),
      maxWidth: z.enum(["md", "lg", "xl"]).optional(),
    })
    .optional(),
  sections: z.array(sectionSchema).min(1).max(24),
});

export type SitePageConfig = z.infer<typeof sitePageSchema>;
export type SiteSection = z.infer<typeof sectionSchema>;
export type SiteTheme = z.infer<typeof themeSchema>;

export type SiteTemplateId = "blank" | "classic" | "studio";

function section(
  id: string,
  type: SiteSectionType,
  order: number,
  props?: SiteSection["props"],
  visible = true,
): SiteSection {
  return { id, type, visible, order, props };
}

/** Templates de partida — sem assets da marca piloto. */
export function getSiteTemplate(id: SiteTemplateId, shopName: string): SitePageConfig {
  const name = shopName.trim() || "Sua barbearia";
  switch (id) {
    case "blank":
      return {
        version: 1,
        theme: {
          primary: "#c4a574",
          background: "#0c0a08",
          surface: "#18181b",
          text: "#fafafa",
          motion: "subtle",
          radius: "md",
        },
        layout: { density: "comfortable", maxWidth: "lg" },
        sections: [
          section("nav", "navbar", 0),
          section("hero", "hero", 1, {
            title: name,
            description: "Monte sua página: edite textos, cores e blocos em Marca.",
            ctaLabel: "Agendar",
          }),
          section("footer", "footer", 2, { showPitch: true }),
        ],
      };
    case "studio":
      return {
        version: 1,
        theme: {
          primary: "#c4a574",
          secondary: "#78716c",
          background: "#0c0a08",
          surface: "#18181b",
          text: "#fafafa",
          motion: "full",
          radius: "lg",
        },
        layout: { density: "spacious", maxWidth: "xl" },
        sections: [
          section("nav", "navbar", 0),
          section("hero", "hero", 1, {
            title: name,
            eyebrow: "Estúdio",
            description: "Experiência visual e atendimento sob medida.",
            ctaLabel: "Reservar horário",
          }),
          section("services", "services", 2, {
            eyebrow: "Serviços",
            title: "O que oferecemos",
            description: "Escolha o que faz sentido para o seu estilo.",
            gridCols: 3,
          }),
          section("team", "team", 3, {
            eyebrow: "Equipe",
            title: "Quem cuida do seu visual",
            description: "Profissionais da casa.",
            gridCols: 3,
          }),
          section("contact", "contact", 4, {
            eyebrow: "Contato",
            title: `Visite a ${name}`,
            description: "Endereço, horários e redes.",
            gridCols: 2,
            schedule: [
              { label: "Seg–Sex", range: "09:00 – 20:00" },
              { label: "Sábado", range: "09:00 – 17:00" },
              { label: "Domingo", range: "Fechado" },
            ],
          }),
          section("footer", "footer", 5, { showPitch: true }),
        ],
      };
    case "classic":
    default:
      return {
        version: 1,
        theme: {
          primary: "#c4a574",
          secondary: "#a8a29e",
          background: "#0c0a08",
          surface: "#18181b",
          text: "#fafafa",
          motion: "subtle",
          radius: "md",
        },
        layout: { density: "comfortable", maxWidth: "lg" },
        sections: [
          section("nav", "navbar", 0),
          section("hero", "hero", 1, {
            title: name,
            description: "Agende online com a cara da sua barbearia.",
            ctaLabel: "Agendar",
          }),
          section("services", "services", 2, {
            eyebrow: "Serviços",
            title: "Pacotes e experiências",
            description: "Escolha o que faz sentido para seu estilo.",
            gridCols: 3,
          }),
          section("about", "about", 3, {
            eyebrow: "Sobre",
            title: name,
            description: "Conte a história da sua casa.",
          }),
          section("contact", "contact", 4, {
            eyebrow: "Contato",
            title: `Venha conhecer a ${name}`,
            description: "Fale conosco ou venha até a unidade.",
            gridCols: 2,
            schedule: [
              { label: "Seg–Sex", range: "09:00 – 20:00" },
              { label: "Sábado", range: "09:00 – 17:00" },
              { label: "Domingo", range: "Fechado" },
            ],
          }),
          section("footer", "footer", 5, { showPitch: true }),
        ],
      };
  }
}

export function parseSitePageConfig(
  raw: unknown,
  shopName: string,
): SitePageConfig {
  const parsed = sitePageSchema.safeParse(raw);
  if (parsed.success) {
    return {
      ...parsed.data,
      sections: [...parsed.data.sections].sort((a, b) => a.order - b.order),
    };
  }
  return getSiteTemplate("classic", shopName);
}

export function visibleSections(config: SitePageConfig): SiteSection[] {
  return config.sections.filter((s) => s.visible).sort((a, b) => a.order - b.order);
}

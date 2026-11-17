# Brief para agente: replicar o Studio de Site (canvas white-label)

Documento para portar **por completo** o ambiente em que as barbearias personalizam a página institucional. Fonte de verdade: este repositório (Barbernegon / Zé do Corte).

**Não é Puck.** É um editor visual próprio estilo Canva, com `Organization.siteJson` v2.

Leitura complementar no mesmo repo:

- [arquitetura.md](./arquitetura.md) — seção “Site editável”
- [modulos-e-arquivos.md](./modulos-e-arquivos.md) — mapa de arquivos
- [barbernegon.md](./barbernegon.md) — produto multi-tenant

---

## 1. O que é este ambiente

Cada barbearia (tenant = `Organization`) tem:

1. **Identidade** (`/admin/marca`) — nome, slug, logo, cor, slogans, redes, mídia hero, opt-in marketplace.
2. **Layout da página pública** (`/admin/site`) — editor canvas com arteboards **desktop** e **mobile** separados.
3. **Site público** (`/{slug}`) — renderiza o JSON salvo com dados ao vivo (serviços, equipe, unidades).

Separação importante:

- **Marca** = quem a barbearia é (URL, logo, contato).
- **Site** = como a página fica visualmente (blocos, posições, tema do canvas).

Só **OWNER** edita (`manageBranding: true`). ADMIN/STAFF não entram em `/admin/site` nem `/admin/marca`.

---

## 2. Modelo de dados

### Organization (Prisma)

Campos de branding + site:

| Campo | Uso |
|--------|-----|
| `name`, `slug` | Nome e URL `/{slug}` |
| `logoUrl`, `primaryColor` | Logo + cor da marca |
| `slogan`, `sloganSecondary` | Textos de apoio |
| `heroMediaUrl`, `aboutText` | Mídia/texto institucionais (Marca) |
| `instagramHref`, `whatsappHref`, `phoneLabel` | Contato / redes |
| `marketplaceListed` | Aparece em `/explorar` |
| `siteJson` | **Canvas v2** (layout da home) |
| `onboardingJson` | Flags booleanas (`branding`, `canvasStudioSeen`, etc.) |
| `timezone` | Default `America/Sao_Paulo` |

Contrato exato: `prisma/schema.prisma` (model `Organization`).

### Contrato `siteJson` v2

Arquivo canônico: `src/lib/site-canvas.ts` (`siteCanvasSchema`).

```ts
{
  version: 2,
  theme?: {
    primary, secondary, background, surface, text, // hex
    bgArt?: "none" | "grid" | "dots" | "diagonal" | "horizon" | "vertical"
      | "glow" | "noise" | "checker" | "blueprint" | "cross" | "rings"
      | "waves" | "spark" | "mesh",
    bgArtColor?,
    bgArtStrength?, // 5–100
    fontDisplay?,
    fontBody?,
    radius?: "sm" | "md" | "lg",
    motion?: "off" | "subtle" | "full"
  },
  artboards: {
    desktop: { width, height }, // default ~1440×2400
    mobile:  { width, height }  // default ~390×3200
  },
  elements: [ /* max 200 */ ]
}
```

Cada elemento:

```ts
{
  id: string,
  type: CanvasElementType,
  artboard: "desktop" | "mobile",
  frame: { x, y, w, h },  // coords absolutas no arteboard
  zIndex: number,
  locked?: boolean,
  hidden?: boolean,
  props?: {
    text, fontSize, fontWeight, color, backgroundColor, borderColor,
    borderWidth, borderRadius, align, href, mediaUrl, mediaZoom,
    mediaPosX, mediaPosY, opacity, title, description, eyebrow,
    ctaLabel, overlay, padding, thickness, variant, gridCols,
    cards[], schedule[], showPitch, ...
  }
}
```

**Tipos de elemento** (`CANVAS_ELEMENT_TYPES`):

| Grupo | Types |
|--------|--------|
| Básicos | `text`, `button`, `badge`, `divider`, `spacer` |
| Layout | `hero`, `panel`, `grid`, `rect` |
| Mídia | `image`, `media` |
| Negócio (dados vivos) | `navbar`, `services`, `team`, `contact`, `footer` |

Legado v1 (`sections[]`) ainda é aceito: `parseSiteCanvasConfig` migra com `migrateSitePageToCanvas`. Cadastros novos gravam só v2.

---

## 3. Arquivos a portar (mapa)

### Domínio / schema

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/lib/site-canvas.ts` | Schema Zod, parse, migrate v1→v2, `createLibraryElement`, `copyDesktopToMobile`, `elementsForArtboard` |
| `src/lib/canvas-page-templates.ts` | 15 modelos de página completos (desktop+mobile) |
| `src/lib/canvas-presets.ts` | Presets de estilo + seções pré-montadas + tipografia |
| `src/lib/canvas-layout-grid.ts` | Snap 8px, alinhamento, smart guides |
| `src/lib/canvas-theme-style.ts` | CSS vars do tema (`canvasThemeStyle`, `resolveCanvasColor`) |
| `src/lib/canvas-bg-art.ts` | Arte de fundo (padrões) |
| `src/lib/canvas-media.ts` | MIME imagem/vídeo, `isCanvasVideoUrl` |
| `src/lib/use-canvas-history.ts` | Undo/redo com commit por gesto |
| `src/lib/org-branding.ts` | `resolveSiteCanvas`, `organizationBrandStyle`, `orgDisplaySlogan` |
| `src/lib/organization.ts` | `orgSelect`, slug reservado, `OrganizationPublic` |
| `src/lib/media-upload-limits.ts` | Limites upload |
| `src/lib/cloudinary-server.ts` | Upload Cloudinary |

### UI editor

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/app/admin/(panel)/site/page.tsx` | Gate auth + carrega org/serviços/barbeiros/unidades |
| `src/components/site-canvas/site-canvas-editor.tsx` | Orquestrador (salvar, templates, dirty, share, mobile sheets) |
| `src/components/site-canvas/canvas-studio-parts.tsx` | Stage drag/resize, biblioteca, ThemePanel, inspector |
| `src/components/site-canvas/canvas-layers-panel.tsx` | Camadas (ordem, lock, hide) |
| `src/components/site-canvas/canvas-phone-preview.tsx` | Preview celular |
| `src/components/site-canvas/canvas-onboarding.tsx` | Tour 1ª visita (`canvasStudioSeen`) |
| `src/components/site-canvas/canvas-confirm-modal.tsx` | Confirmações (ex.: trocar modelo) |

### UI marca + público

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/app/admin/(panel)/marca/page.tsx` + `src/components/brand-editor-form.tsx` | Identidade |
| `src/app/[slug]/page.tsx` | Home do tenant |
| `src/components/tenant-canvas-renderer.tsx` | Render público + `CanvasElementView` (reusado no editor) |
| `src/components/home-services-grid.tsx`, `home-barbers-grid.tsx`, `home-contact-grid.tsx`, `site-footer.tsx`, `brand-logo.tsx` | Blocos de negócio |

### APIs

| Rota | Função |
|------|--------|
| `GET/PATCH /api/admin/organization` | Lê/salva branding + `siteJson` + `siteTemplate` + `onboardingJson` |
| `POST /api/admin/organization/brand-asset` | Upload multipart `kind`: `logo` \| `hero` \| `canvas` → Cloudinary |
| `POST /api/cadastro` | Cria org com `siteJson = getCanvasTemplate("classic", name)` |

### Permissão

Em `src/lib/staff-access.ts`: `manageBranding` só para `OWNER`. Páginas redirecionam sem permissão; API responde 403.

Nav: grupo **Marca & presença** em `src/lib/admin-nav-config.ts` (`/admin/marca`, `/admin/site`).

---

## 4. Fluxo do usuário (como se usa)

### Primeiro acesso

1. Dono cria conta em `/cadastro` → org + OWNER + unidade + canvas **classic**.
2. Painel → **Marca & presença** → **Marca** e **Site**.
3. Na 1ª visita a `/admin/site`, onboarding (`CanvasOnboarding`) até marcar `onboardingJson.canvasStudioSeen`.

### Em `/admin/marca`

Edita e salva via `PATCH /api/admin/organization`:

- nome, slug (único, não reservado), logo (upload ou URL), cor (`#RRGGBB`), slogans, hero, about, Instagram, WhatsApp, telefone, marketplace.
- Upload: `POST .../brand-asset` com `kind=logo|hero`.

### Em `/admin/site` (studio)

Layout desktop: 3 colunas — **Biblioteca/Camadas** | **canvas** | **inspector/tema**.  
Mobile: dock + folhas (library, inspector, options, templates).

**Arteboards:** toggle Desktop ↔ Celular. Elementos de um **não** aparecem no outro (são cópias independentes). Ação **copiar desktop → mobile** (`copyDesktopToMobile`) escala frames.

**Biblioteca — abas:**

1. **Itens** — grupos Básicos / Layout / Mídia / Negócio.
2. **Seções** — pré-montadas (`PREMADE_SECTIONS` em `canvas-presets.ts`): faixa de cor, Manhã/Tarde/Noite, hero+diferenciais, CTA, serviços, prova social, intro, contato+rodapé.
3. **Prontos** — estilos de botão/badge/painel/texto/hero/retângulo.

**Modelos de página** (substitui o canvas inteiro — pedir confirmação):

`blank`, `classic`, `studio`, `minimal`, `moderno`, `editorial`, `impacto`, `noir`, `neon`, `brutalista`, `ocean`, `boutique`, `bauhaus`, `rua`, `vitrine`

API: `PATCH { siteTemplate: "studio" }` regenera `siteJson` e pode atualizar `primaryColor` com a cor do tema do modelo. Metadados: `PAGE_TEMPLATE_META` em `canvas-page-templates.ts`.

**Interação no stage:**

- Selecionar → barra flutuante: duplicar, excluir, frente/fundo, travar.
- Drag/resize com handles 8 direções; snap grade **8px**; **smart guides** ao centrar/alinhar com outros elementos (`canvas-layout-grid.ts`).
- `spacer` só mostra listras no editor (`editorChrome`), transparente no público.
- Undo/redo (`useCanvasHistory`); dirty state vs último save.
- ThemePanel: cores do sistema + arte de fundo + tipografia.
- Inspector: conteúdo primeiro; “Posição e tamanho” recolhido; presets por tipo; zoom/crop de mídia (`mediaZoom`, `mediaPosX/Y`).
- Upload de mídia no canvas: `kind=canvas` (imagem até ~30 MB, vídeo ~60 MB — ver `media-upload-limits.ts`).
- Salvar: `PATCH { siteJson, primaryColor, onboardingJson: { branding: true, canvasStudioSeen: true } }` → toast “no ar”.
- Compartilhar: copiar link do site / QR; “Ver site” abre `/{slug}`.

### Site público `/{slug}`

1. `getOrganizationBySlug` → `resolveSiteCanvas(org)`.
2. Carrega serviços, barbeiros (`showOnWebsite`), unidades.
3. `TenantCanvasRenderer` escolhe arteboard por viewport (desktop/mobile).
4. Frames em **%** do arteboard (`left/top/width/height` relativos).
5. Links especiais em botões/hero: `href: "book"` → `/{slug}/agendar`; `"home"` → `/{slug}`.
6. Blocos de negócio leem BD em tempo real (não embutem lista no JSON).

---

## 5. Comportamento por tipo de elemento (render)

Implementação única: `CanvasElementView` em `tenant-canvas-renderer.tsx` (editor e público compartilham).

| Type | Render |
|------|--------|
| `text` | Texto com fontSize/weight/align/color; variants `display`/`title`/`eyebrow` usam `font-display` |
| `button` | Link estilizado; `href` resolvido |
| `rect` | Bloco sólido (faixas/fundos); cores podem ser `theme.primary` |
| `image`/`media` | Cover com zoom/posição; vídeo autoplay muted loop |
| `navbar` | Logo org + nome + CTA Agendar |
| `services` | `HomeServicesGrid` themed (paleta do canvas) |
| `team` | `HomeBarbersGrid` ou placeholder “Sem profissionais” |
| `contact` | `HomeContactGrid` (unidades + schedule props) |
| `footer` | `SiteFooter` (+ pitch opcional) |
| `hero` | Faixa com eyebrow/title/description/CTA + overlay + mídia opcional |
| `panel` | Card título/descrição |
| `grid` | Grade de `cards[]` (title/description/emoji) |
| `divider` | Linha com `thickness`/`color` |
| `badge` | Selo |
| `spacer` | Respiro (invisível no público) |

Cores: `resolveCanvasColor` aceita hex ou tokens tipo `theme.primary` → CSS vars (`--site-*`, `--color-brand-*`) via `canvasThemeStyle`.

---

## 6. Design / UX a preservar

- Metáfora **Canva-lite**: livre posicionamento absoluto, não page-builder em colunas.
- **Dois arteboards** de verdade (não só CSS responsivo).
- Chrome do studio segue tema do painel admin (claro/escuro); o canvas do tenant usa o **tema do siteJson**.
- Grade guia no editor **não** vai para o site; `bgArt` sim.
- Mobile: seleção abre dock; edição em bottom sheet (não forçar 3 colunas no celular).
- Confirmar ações destrutivas (aplicar modelo, limpar).
- Textos UI em **português do Brasil**.
- Tokens de marca do painel: `--bn-*` / `src/lib/brand-tokens.ts` — não misturar com tokens do site do tenant (`--site-*`).

---

## 7. Dependências externas

- **PostgreSQL + Prisma** — `Organization.siteJson` Json.
- **Cloudinary** — uploads; sem config, upload retorna 503 (URL externa ainda funciona na Marca).
- **Next.js App Router** + React client components no editor/renderer.
- **Zod** — validação do canvas.
- **Tailwind** — classes do studio e do render.
- Framer Motion opcional em outras partes; o núcleo do canvas é pointer events + state.

---

## 8. Plano de replicação (ordem sugerida)

1. **Schema** — campos de branding + `siteJson` + `onboardingJson` no tenant.
2. **Contrato** — portar `site-canvas.ts` + testes de parse/migrate.
3. **Tema** — `canvas-theme-style.ts` + `canvas-bg-art.ts`.
4. **Renderer** — `TenantCanvasRenderer` + grids de negócio (podem mockar dados no início).
5. **Rota pública** `/{slug}` consumindo o JSON.
6. **API** GET/PATCH organization + brand-asset.
7. **Editor** — history → stage (drag/resize/guides) → library → inspector → ThemePanel → templates → onboarding.
8. **Marca** — formulário separado.
9. **Cadastro** — seed com template `classic`.
10. **Permissões** — só owner.
11. **Presets/templates** — `canvas-presets.ts` + `canvas-page-templates.ts` (arquivo grande; portar por último ou em fatias).
12. **Demo** — opcional template `vitrine` + script de seed (`scripts/apply-demo-vitrine.ts`, `src/lib/demo-vitrine.ts`).

Critério de “completo”: owner aplica modelo, arrasta elementos, edita tema, sobe foto, salva, abre `/{slug}` no celular e no desktop e vê layouts distintos batendo com o editor.

---

## 9. Checklist MVP (mínimo viável)

Se o outro projeto precisar de um primeiro corte menor:

- [ ] Tenant com `siteJson` + branding básico (nome, slug, logo, primaryColor)
- [ ] Schema v2 + `parseSiteCanvasConfig` + template `classic` e `blank`
- [ ] Render público absoluto com arteboard desktop **ou** mobile (viewport)
- [ ] Tipos: `text`, `button`, `rect`, `image`, `navbar`, `footer`
- [ ] Editor: adicionar da biblioteca, selecionar, drag, resize, salvar
- [ ] `PATCH` `siteJson` autenticado (só owner)
- [ ] Upload imagem (Cloudinary ou equivalente)

Fora do MVP inicial (portar na onda 2):

- Arteboards desktop+mobile editáveis em paralelo + `copyDesktopToMobile`
- Smart guides, camadas, undo/redo
- Blocos `services` / `team` / `contact` com dados vivos
- Presets, seções pré-montadas, 15 page templates, `bgArt`, onboarding, QR/share

---

## 10. Armadilhas

- Desktop e mobile são **listas distintas** no mesmo array (`artboard` field) — bugs clássicos ao filtrar/salvar.
- Validação Zod estrita: frames finos (`h: 1`) e `borderRadius: 999` já têm soft-recovery no parse — manter.
- `primaryColor` da org e `theme.primary` do canvas: save do site sincroniza; `resolveSiteCanvas` injeta primary da org se o canvas não tiver.
- Blocos `services`/`team` vazios se não houver dados de catálogo/equipe com `showOnWebsite`.
- Slugs reservados (`admin`, `api`, `explorar`, etc.) — validar no PATCH (`isReservedSlug`).
- Não usar constantes de marca da plataforma (`BARBER_*`, logo Barbernegon) como fallback do site do tenant.
- Max 200 elementos — templates densos (ex. `vitrine`) precisam caber.

---

## 11. Prompt curto para colar no outro agente

> Replique o Studio de Site white-label do Barbernegon: editor Canva-like com `siteJson` v2 (arteboards desktop/mobile, elements com frame absoluto), identidade em `/admin/marca`, edição em `/admin/site`, render em `/{slug}` via `TenantCanvasRenderer`. Use o contrato Zod de `site-canvas.ts`, biblioteca de tipos (text/button/hero/…/services/team/contact), presets, 15 page templates, ThemePanel com bgArt, snap 8px + smart guides, undo/redo, upload Cloudinary, e persistência via PATCH organization. Só o owner edita. Desktop e mobile são layouts separados. Não use Puck — porte a arquitetura deste monólito Next.js descrita em `docs/brief-replicacao-studio-site.md`.

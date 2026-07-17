---
name: Barbernegon Electric Blue
colors:
  background: '#0f1419'
  on-background: '#e2eaf4'
  surface: '#121820'
  surface-high: '#1e2733'
  surface-lowest: '#0a0e13'
  surface-glass: '#FFFFFF05'
  on-surface: '#e2eaf4'
  on-surface-muted: '#a8b6c9'
  outline: '#7a889c'
  outline-subtle: 'rgba(255, 255, 255, 0.08)'
  outline-soft: 'rgba(255, 255, 255, 0.10)'
  primary: '#8eb6ff'
  primary-container: '#3b82f6'
  on-primary: '#001a4d'
  primary-deep: '#2563eb'
  primary-900: '#1e3a8a'
  brand-300: '#93c5fd'
  brand-400: '#8eb6ff'
  brand-500: '#3b82f6'
  brand-600: '#2563eb'
  brand-950: '#0f1419'
  brand-surface-10: '#152033'
  brand-surface-15: '#1a2740'
  brand-surface-20: '#1e2f4d'
  success: '#22c55e'
  danger: '#f43f5e'
  selection: 'rgba(59, 130, 246, 0.45)'
  glow-primary: 'rgba(59, 130, 246, 0.35)'
  nebula-a: 'rgba(59, 130, 246, 0.20)'
  nebula-b: 'rgba(142, 182, 255, 0.12)'
typography:
  display-hero:
    fontFamily: Geist
    fontSize: 80px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  display-hero-mobile:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Geist
    fontSize: 56px
    fontWeight: '700'
    lineHeight: '1.15'
    letterSpacing: -0.03em
  headline-md:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  title-brand:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.1em
  tenant-display:
    fontFamily: Bebas Neue
    fontSize: 64px
    fontWeight: '400'
    lineHeight: '1.05'
    letterSpacing: 0.04em
rounded:
  sm: 0.35rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.25rem
  2xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1440px
  container-content: 1200px
  gutter-desktop: 64px
  gutter-mobile: 20px
  nav-height: 80px
  section-y: 128px
  section-y-mobile: 96px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  stack-xl: 48px
---

## Brand & Style

**Barbernegon** is a premium SaaS platform for independent barbershops. Brand personality: precise, confident, anti-bureaucracy, exclusive — built for demanding professionals who refuse to dilute their identity inside aggregator apps.

Core promise (always hero-level): **“Sua barbearia. Sua cara.”**

Visual direction: **Dark Cinematic Minimalism** with **Electric Blue**. Deep charcoal canvases, frosted glass chrome, soft nebula glows, razor-sharp type, and intentional motion. Photography (when used) is cinematic barbershop craft — never stock-looking collage cards in the marketing hero.

Product surfaces in this system:

1. **Marketing** — `/` landing, `/cadastro`, `/planos`
2. **Tenant sites** — `/{slug}` public barbershop pages (themeable)
3. **Booking** — `/{slug}/agendar`
4. **Admin** — `/admin/*` ops panel
5. **Marketplace** — `/explorar` uses the sibling system **Onyx & Azure** (separate DESIGN.md); do not mix its solid slate cards into marketing screens unless explicitly requested

Language: **Brazilian Portuguese** in all UI copy. Avoid European Portuguese wording.

## Colors

Anchored in dark mode only — no light theme, no purple, no cream/terracotta.

- **Background** `#0f1419` — primary canvas. Deeper void `#0a0e13` for lowest surfaces.
- **Primary (Electric Blue)** — action & identity:
  - Soft accent / CTA fill: `#8eb6ff`
  - Strong container / brand core: `#3b82f6`
  - Deep hover / gradient end: `#2563eb`
  - Text on primary pills: `#001a4d` (or white on filled hover)
- **Text** — on-surface `#e2eaf4`, muted `#a8b6c9`
- **Glass** — `rgba(255,255,255,0.02–0.06)` fills + `white/10` borders + `backdrop-blur` 12–20px
- **Semantic** — success `#22c55e`, danger `#f43f5e`
- **Atmosphere** — dual radial nebula (blue `0.2` top-left, soft blue `0.12` top-right) over the background; optional WebGL shader nebula on marketing

**Allowed gradients (marketing/tenant only):**

- Headline clip: `linear-gradient(120deg, #eff6ff → #8eb6ff → #3b82f6 → #2563eb)`
- Tenant primary CTA: `from-brand-300 via-brand-400 to-brand-500` with dark text `#09090b` / `zinc-950`
- Body selection: `rgba(59,130,246,0.45)`

**Avoid:** purple/indigo themes, warm cream paper looks, heavy multi-layer drop shadows, emoji decoration, flat single-color empty heroes without atmosphere.

## Typography

Three roles:

| Role | Family | Use |
|------|--------|-----|
| Body / UI | **Geist** | Marketing body, admin, forms, paragraphs |
| Labels | **JetBrains Mono** | Uppercase nav labels, section eyebrows, CTA label text (`12px`, `tracking 0.1em`) |
| Tenant display | **Bebas Neue** | Public barbershop site titles — uppercase, wide tracking |

Marketing hero H1: Geist Extrabold 48→80px, tracking `-0.04em`, gradient text clip. Second line of the brand promise may be optically shifted right (`ml-12` / `md:ml-24`) for editorial tension.

Section H2: Geist Bold ~24→56px, tight tracking. Supporting copy: Geist 16–18px in muted blue-gray.

Admin / dense UI: prefer `text-sm` (14px) on zinc/brand surfaces.

## Layout & Spacing

- Marketing max width: **1440px**; content rhythm often aligns to **12-column** mental grid (hero text spans ~8 cols).
- Tenant content max: **1200px** (`.container-max`).
- Nav height marketing: **80px**, fixed glass bar.
- Section vertical padding: `py-24` / `md:py-32` (generous breathing room).
- Mobile horizontal padding: **20px**; desktop: **64px** (`px-5` / `md:px-16`).
- Vertical rhythm multiples of **8px**.

**First viewport rules (marketing):**

- One composition (not a dashboard)
- Brand wordmark is hero-level (logo/name is a primary signal)
- One headline, one short supporting sentence, one CTA group
- Dominant atmospheric visual (shader/orb/nebula) — full-bleed plane, not an inset card image
- No stat strips, schedule snippets, address blocks, or promo chips overlaid on the hero

## Elevation & Depth

Depth comes from **glass + glow**, not heavy skeuomorphic shadows.

1. **Base** — `#0f1419` (+ nebula gradients)
2. **Glass chrome** — nav/footer/cards: ultra-low white alpha + blur 20px + inset top highlight `rgba(255,255,255,0.05)`
3. **Glass card** — gradient `135deg` white 6%→2%, border `rgba(255,255,255,0.08)`, blur 12px
4. **Interactive glow** — primary CTA shadow `0 0 15px rgba(59,130,246,0.35)`; hover lift cards `-translate-y-2` (marketing) or soft brand shadow on tenant cards
5. **Focus** — brand ring / border `brand-500/60` with ring `brand-500/25`

## Shapes

- **Primary CTAs & marketing actions:** `rounded-full` pills
- **Glass content cards:** `rounded-lg` (marketing) or `rounded-xl` / `rounded-2xl` (tenant/admin)
- **Form fields:** `rounded-xl`
- **Chips / duration badges:** pills or soft rounds
- **Checkboxes:** `0.35rem` radius

## Components

### Navigation (marketing)

- Fixed, full-width, height 80px
- Glass: `bg #FFFFFF05`, blur 20px, bottom border `white/10`
- Left: wordmark **Barbernegon** (Geist semibold, up to 32px desktop)
- Center links: MonoLabel uppercase (Produto, Soluções, Barbearias, Planos)
- Right: ghost “Entrar” + filled pill “Começar” (`#8eb6ff` bg, `#001a4d` text, blue glow)

### Hero

- Min height ~ full viewport (≤921px / 100svh)
- H1 gradient brand promise split on two lines
- Muted supporting paragraph max ~2xl width
- Ghost/outline pill CTA “Começar agora”
- Right/atmosphere: animated orb or nebula (scissors + calendar metaphor OK) — no floating promo stickers

### Section header

- Optional MonoLabel eyebrow
- Large H2 + one muted sentence
- One job per section

### Cards

- Marketing `GlassCard`: border `white/10`, bg `white/[0.02]`, blur 20px, hover lift
- Prefer glass over opaque “dashboard cards” on marketing
- Marketplace shop cards follow **Onyx & Azure** (solid `#25282B` / `#2F3336`) — separate system

### Buttons

- **Primary pill:** `#8eb6ff` → hover toward `#3b82f6` / white text; slight `scale-95` on press
- **Ghost:** border `white/15–30`, dark surface fill, primary text
- **Tenant gradient CTA:** brand-300→500, dark label text
- **Admin primary:** solid `brand-500`, text `zinc-950`, rounded-full

### Forms

- Field: `rounded-xl`, border `white/10`, bg `zinc-950/50` or `#0a0e13/70`
- Text `#e2eaf4` / zinc-100; placeholder muted
- Focus: border `brand-500/60`, ring brand
- Error: rose border/bg soft (`rose-500/30`, `rose-500/10`)

### Badges

- Service duration: brand-tinted pill
- Status: emerald / blue / rose soft fills
- Marketplace “Novo”: gold `#C5A059` (Onyx system only)

### Footer

- Minimal 2-column
- Tagline: “Feito com precisão para barbearias exigentes.”
- Mono-style link list; copyright year + Barbernegon

## Motion

Editorial ease curve: **`[0.16, 1, 0.3, 1]`**

- Section reveal: fade-up ~30px, ~0.8s, once in view
- Respect `prefers-reduced-motion`
- Hover: card lift, CTA scale — presence, not noise
- Marketing may include subtle WebGL nebula and hero orb animation

## Screen inventory (for Stitch prompts)

Use this system when generating:

| Screen | Notes |
|--------|--------|
| Landing `/` | Nav glass + hero promise + Identity cards + Site section + Ops trio + final CTA + footer |
| Cadastro | Centered onboarding form on radial blue void; Barbernegon link |
| Planos | Starter vs Pro comparison; Pro highlighted with brand border glow |
| Admin login | Glass card, email/password, platform chrome |
| Admin dashboard | Sidebar 240px, dark dense UI, charts — still Electric Blue tokens |
| Tenant home | Bebas display titles, brandable primary, glass service cards, full-bleed hero media |
| Booking | Glass form, two-column desktop, step clarity, brand CTAs |

When generating **Explorar / favoritos**, switch to **Onyx & Azure** DESIGN.md (Montserrat + Inter, solid slate, primary `#adc6ff`).

## Do / Don't

**Do**

- Keep brand name visually dominant on marketing first viewport
- Use Mono labels for chrome actions
- Prefer glass + blue glow over heavy shadows
- Write UI in pt-BR, direct and premium

**Don't**

- Light mode
- Purple / violet accents
- Inset hero image cards on landing
- Stat strips or promo stickers on the hero
- Mix Onyx solid marketplace cards into the marketing landing
- European Portuguese copy (*ficheiro*, *utilizador*, *contacto*)

---
name: Barbernegon Onyx Electric Blue
colors:
  background: '#10131a'
  on-background: '#e1e2ec'
  surface-elevated: '#25282B'
  surface-container: '#1d2027'
  surface-lowest: '#0b0e15'
  surface-low: '#191b23'
  on-surface: '#e1e2ec'
  on-surface-variant: '#c2c6d6'
  text-muted: '#9CA3AF'
  border-subtle: '#2F3336'
  outline: '#8c909f'
  primary: '#adc6ff'
  primary-container: '#3B82F6'
  on-primary: '#002e6a'
  accent-gold: '#C5A059'
  brand-400: '#8eb6ff'
  brand-500: '#3b82f6'
  brand-950: '#0f1419'
  success: '#22c55e'
  danger: '#f43f5e'
typography:
  display-hero:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  title-brand:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1'
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '700'
    letterSpacing: 0.1em
  tenant-display:
    fontFamily: Bebas Neue
    fontSize: 64px
    fontWeight: '400'
---

## Brand & Style

**Barbernegon** is a premium SaaS for independent barbershops. Promise: **“Sua barbearia. Sua cara.”**

Visual: **Dark Cinematic Minimalism** + **Electric Blue** on **Onyx** canvas `#10131a`. Soft primary accent `#adc6ff`, CTA fill `#3B82F6`. No purple. No light mode.

**Canonical tokens:** `src/lib/brand-tokens.ts` (`BN`) and CSS class `.brand-onyx` (`--bn-*` in `globals.css`).

Product surfaces:

1. **Marketing** — `/`, `/planos` (route group `(public)` + `PublicBrandShell`), `/cadastro`, `/admin/login`
2. **Tenant** — `/{slug}` (themeable `brand-*`)
3. **Admin** — `/admin/*` chrome = BN (P1): `.brand-onyx`, sidebar agrupada, `AdminPageHeader`, footer “Barbernegon · Painel”. **Canvas `/admin/site`**: chrome do studio também BN; elementos do tenant no palco continuam com `brand-*` do tema.
4. **Marketplace** — `/explorar` (Onyx & Azure sibling)

Language: **pt-BR**.

## Marketing typography

- Headlines: **Montserrat** 600/700 (`--font-brand-headline`)
- Body: **Geist**
- Do **not** use Bebas Neue on marketing/plan prices (Bebas is tenant display only)

## Admin chrome (P1)

- Layout: `src/app/admin/(panel)/layout.tsx` — `.brand-onyx` + Montserrat
- Nav: `admin-panel-nav.tsx` — grupos Operação / Marca & presença / Financeiro / Conta; ativo com primary BN
- Page headers: `admin-page-header.tsx` (sentence case, LabelCaps eyebrow)
- Onboarding: `onboarding-checklist.tsx` (UI BN; lógica `computeOnboardingChecklist` inalterada)
- KPI envelopes: superfície `border --bn-border` + `bg --bn-surface-elevated` (sem `.glass-card` na visão geral)
- **Canvas studio** (`/admin/site`): chrome BN + onboarding por modelos + camadas + preview celular; conteúdo desenhado = tema do tenant (`canvasThemeStyle` / `brand-*`)

## Screen inventory

| Screen | Notes |
|--------|--------|
| Landing `/` | Full-bleed photo hero, Identity, Site, Ops, CTA; shared nav |
| Planos `/planos` | Same public chrome; `SaasPlanComparison` with BN tokens |
| Cadastro | AuthShell split + photo |
| Admin login | AuthShell centered |
| Admin panel | Chrome BN + menu agrupado; product footer (not tenant SiteFooter) |
| Admin site `/admin/site` | Studio BN; Desktop/Celular; Publicar; preview celular local |
| Explorar | Marketplace Onyx & Azure |

## Do / Don't

**Do** — use `--bn-*` / `.brand-onyx` on marketing, auth, planos **e chrome do admin/canvas**; Montserrat for marketing/admin titles; keep tenant `brand-*` for elementos do site no canvas.

**Don't** — `#0f1419` / `#8eb6ff` on new marketing/admin chrome; Bebas on plan prices or admin page headers; SiteFooter tenant chrome inside `/admin` panel; jargão de design (arteboard/overlay/z-index) na UI do dono.

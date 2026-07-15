# Barbernegon — plataforma multi-tenant para barbearias

## Visão

Transformar o produto mono-marca **Zé do Corte** em **Barbernegon**: SaaS onde cada dono cria a própria organização, personaliza o site institucional e opera agenda + admin + caixa + clube de assinaturas.

**Posicionamento:** “Sua barbearia, sua cara, sem burocracia.”

## Decisões de produto

| Tema | Decisão |
|------|---------|
| URL pública | Path slug: `barbernegon.com/[slug]`; marketplace e landing B2B em hosts distintos (opcional) |
| MVP | Site white-label + agendamento + admin + caixa + clube de assinaturas |
| App nativo | Fora do MVP (site + PWA depois) |
| Domínio próprio | Fase posterior (salão); **split marketing/marketplace** já suportado via env |

## Diferenciação vs mercado

| Player | Fraqueza típica | Resposta Barbernegon |
|--------|-----------------|----------------------|
| App Barber | Cancelamento burocrático, cobranças confusas | Cancelamento claro; UX enxuta |
| Cash Barber | Travamentos, suporte lento, onboarding pesado | Setup em minutos; financeiro transparente |
| BestBarbers | App Store caro/lento | Site com identidade forte, sem loja de apps |
| Booksy/Trinks | Marketplace dilui marca | Site white-label próprio; descoberta em `/explorar` só encaminha ao site da marca |

## Arquitetura (resumo)

- **Organization** = tenant (marca, slug, branding, **`siteJson`**, timezone, `planStatus` / `planTier`, Asaas)
- **BarbershopUnit** = loja/filial dentro da org
- **StaffMember** = OWNER/ADMIN/STAFF scoped à org
- Público: `/[slug]` (renderer por blocos), `/[slug]/agendar`
- Admin: `/admin` filtrado por `organizationId` da sessão; **`/admin/marca`** = identidade + editor de site
- Plataforma (produto B2B): `/` (landing) + `/cadastro` + `/planos` — host `NEXT_PUBLIC_MARKETING_HOST`
- Marketplace (consumidor): `/explorar` (+ `/` no host consumer) — `NEXT_PUBLIC_MARKETPLACE_HOST`; não serve a landing B2B
- Plataforma (ops): `/plataforma` + `/plataforma/login` — métricas, barbearias, marketplace, consumidores (`PLATFORM_ADMIN_EMAILS` / `SEED_OWNER_EMAIL`)

## Roadmap por ondas

1. **Fundação** — Organization, isolamento, rotas slug, cadastro, editor de marca ✅
2. **Produto** — polish white-label + checklist de onboarding ✅
3. **Caixa + assinaturas** — relatórios de caixa; planos do clube; cancelamento simples ✅
4. **Plataforma** — landing Barbernegon, billing Asaas SaaS; domínio próprio depois (domínio = fase posterior) ✅ billing / ⏳ domínio
5. **Site editável** — canvas livre tipo Canva (`siteJson` v2 + `/admin/site`) ✅
6. **Pagamentos** — Asaas SaaS + PIX/clube do salão ✅

## Rotas principais

| Rota | Função |
|------|--------|
| `/` | Landing Barbernegon |
| `/explorar` | Marketplace: busca barbearias → site `/{slug}` (+ favoritos, mapa, notas) |
| `/explorar/favoritos` | Lista salva neste aparelho |
| `/plataforma` | Ops Barbernegon (`/plataforma/login`) |
| `/plataforma/marketplace` | Moderação de listagens e reviews |
| `/plataforma/consumidores` | Agendamentos / clientes finais (cross-tenant) |
| `/cadastro` | Onboarding do dono (cria org + OWNER + unidade + canvas classic) |
| `/planos` | Planos da plataforma (Starter/Pro) |
| `/[slug]` | Site institucional (canvas) |
| `/[slug]/agendar` | Agendamento scoped |
| `/admin/marca` | Identidade (logo, slug, redes) |
| `/admin/site` | Editor canvas desktop/mobile |
| `/admin/caixa` | Relatório de caixa (Pro/trial) |
| `/admin/pagamentos` | Conta Asaas do salão |
| `/admin/clube` | Planos e assinantes (Pro/trial) |
| `/admin/plano` | Assinatura Barbernegon (Asaas) |

## Migração

- Tenant seed: `ze-do-corte` (`org_ze_do_corte_default`)
- Migrations: `20260713210000_barbernegon_organization`, `20260713213000_organization_plan_enums`, `20260713220000_organization_site_json`, `20260714200000_whatsapp_cloud_api`, `20260714210000_asaas_payments`
- Legacy `/agendar` redireciona para `/ze-do-corte/agendar`
- `BARBER_*` / `logo.jpeg` / vídeo do piloto: **somente** seed/legado — nunca fallback silencioso de tenant

## Branch

`cursor/barbernegon-4367`

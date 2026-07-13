# Barbernegon — plataforma multi-tenant para barbearias

## Visão

Transformar o produto mono-marca **Zé do Corte** em **Barbernegon**: SaaS onde cada dono cria a própria organização, personaliza o site institucional e opera agenda + admin + caixa + clube de assinaturas.

**Posicionamento:** “Sua barbearia, sua cara, sem burocracia.”

## Decisões de produto

| Tema | Decisão |
|------|---------|
| URL pública | Path slug: `barbernegon.com/[slug]` |
| MVP | Site white-label + agendamento + admin + caixa + clube de assinaturas |
| App nativo | Fora do MVP (site + PWA depois) |
| Domínio próprio | Fase posterior |

## Diferenciação vs mercado

| Player | Fraqueza típica | Resposta Barbernegon |
|--------|-----------------|----------------------|
| App Barber | Cancelamento burocrático, cobranças confusas | Cancelamento claro; UX enxuta |
| Cash Barber | Travamentos, suporte lento, onboarding pesado | Setup em minutos; financeiro transparente |
| BestBarbers | App Store caro/lento | Site com identidade forte, sem loja de apps |
| Booksy/Trinks | Marketplace dilui marca | Site próprio da marca, zero concorrentes na tela |

## Arquitetura (resumo)

- **Organization** = tenant (marca, slug, branding, timezone, `planStatus`)
- **BarbershopUnit** = loja/filial dentro da org
- **StaffMember** = OWNER/ADMIN/STAFF scoped à org
- Público: `/[slug]`, `/[slug]/agendar`
- Admin: `/admin` filtrado por `organizationId` da sessão
- Plataforma: `/` (landing) + `/cadastro` + `/planos`

## Roadmap por ondas

1. **Fundação** — Organization, isolamento, rotas slug, cadastro, editor de marca ✅
2. **Produto** — polish white-label + checklist de onboarding ✅
3. **Caixa + assinaturas** — relatórios de caixa; planos do clube; cancelamento simples ✅
4. **Plataforma** — landing Barbernegon, billing stub do SaaS; domínio próprio depois ✅ (domínio = fase posterior)

## Rotas principais

| Rota | Função |
|------|--------|
| `/` | Landing Barbernegon |
| `/cadastro` | Onboarding do dono (cria org + OWNER + unidade) |
| `/planos` | Planos da plataforma (stub) |
| `/[slug]` | Site institucional white-label |
| `/[slug]/agendar` | Agendamento scoped |
| `/admin/marca` | Editor de branding |
| `/admin/caixa` | Relatório de caixa |
| `/admin/clube` | Planos e assinantes (cancelamento imediato) |
| `/admin/plano` | Plano Barbernegon do dono (billing stub) |

## Migração

- Tenant seed: `ze-do-corte` (`org_ze_do_corte_default`)
- Migration: `prisma/migrations/20260713210000_barbernegon_organization`
- Legacy `/agendar` redireciona para `/ze-do-corte/agendar`

## Branch

`cursor/barbernegon-4367`

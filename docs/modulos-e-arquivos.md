# Módulos e arquivos-chave

Mapa orientativo — quando alterar uma área, atualize também [historico-de-mudancas.md](./historico-de-mudancas.md) se o comportamento visível ou de API mudar.

## Raiz do repositório

| Caminho | Função |
|---------|--------|
| `package.json` | Scripts `dev`, `build`, `db:*`, dependências |
| `.env.example` | Modelo de variáveis (nunca commitar segredos reais) |
| `INICIAR_ZE_DO_CORTE.bat` | Inicialização assistida no Windows (Node, Prisma, `npm run dev`) |
| `PREPARAR_BASE.bat` | Docker Postgres + `.env` + `prisma db push` + seed |
| `docker-compose.yml` | Serviço `postgres:16` para desenvolvimento local |
| `railway.toml` | Deploy Railway: builder Dockerfile + `startCommand` (`npm run start:prod`) |
| `Dockerfile` | Node 24, build Next; `start:prod` = migrate + `ensure-owner` + next |
| `nixpacks.toml` | (Opcional) referência Node para builds sem Dockerfile |
| `prisma/migrations/` | Migrações versionadas (`migrate deploy` em produção) |
| `scripts/preparar-postgres.ps1` | Script chamado pelo `PREPARAR_BASE.bat` |
| `scripts/create-owner.ts` | `npm run create-owner` — upsert de `StaffMember` OWNER + senha |
| `scripts/ensure-owner.ts` | Arranque em produção: cria OWNER se `SEED_OWNER_*` (chamado por `start:prod`) |
| `src/lib/ensure-owner-with-prisma.ts` | Lógica idempotente OWNER a partir de `SEED_OWNER_*` (script + `instrumentation`) |
| `src/instrumentation.ts` | Produção: reforço da criação do OWNER no arranque do Next |
| `INICIAR_APLICACAO.bat` | Legado: outro projeto Laravel em `reviews-platform` (não é este app) |

## App Router — páginas

| Rota | Arquivo | Notas |
|------|---------|--------|
| `/` | `src/app/(public)/page.tsx` | Landing **Barbernegon** premium (shell em `(public)/layout.tsx`) |
| `/explorar` | `src/app/(public)/explorar/page.tsx` | Marketplace: busca salões → site/`agendar` do tenant |
| `/explorar/favoritos` | `src/app/(public)/explorar/favoritos/page.tsx` | Favoritos salvos neste aparelho |
| `/plataforma/login` | `src/app/plataforma/login/page.tsx` | Login exclusivo Ops |
| `/plataforma` | `src/app/plataforma/(ops)/page.tsx` | Ops: overview com KPIs, taxas e gráficos (7d/30d) |
| `/plataforma/barbearias` | `src/app/plataforma/(ops)/barbearias/page.tsx` | Lista de orgs |
| `/plataforma/barbearias/[id]` | `src/app/plataforma/(ops)/barbearias/[id]/page.tsx` | Detalhe + editar plano |
| `/plataforma/marketplace` | `src/app/plataforma/(ops)/marketplace/page.tsx` | Listagens + reviews |
| `/plataforma/consumidores` | `src/app/plataforma/(ops)/consumidores/page.tsx` | Agendamentos cross-tenant |
| `/cadastro` | `src/app/cadastro/page.tsx` | Cria org + OWNER + unidade + `siteJson` template classic |
| `/planos` | `src/app/planos/page.tsx` | Planos da plataforma (Starter/Pro) |
| `/[slug]` | `src/app/[slug]/page.tsx` | Site institucional via `TenantSiteRenderer` + `siteJson` |
| `/[slug]/agendar` | `src/app/[slug]/agendar/page.tsx` | Agendamento scoped à org |
| `/agendar` | `src/app/agendar/page.tsx` | Legado → redirect tenant seed |
| `/minha-reserva/[token]` | `src/app/minha-reserva/[token]/page.tsx` | Cliente altera/cancela sem login (`manage-reservation-client.tsx`) |
| `/admin` | `src/app/admin/(panel)/page.tsx` | Dashboard + métricas + gráficos + **Resumo operacional** (filtros GET) + tabela + paginação `?page=` |
| `/admin/marca` | `src/app/admin/(panel)/marca/page.tsx` | Identidade (logo, slug, redes) |
| `/admin/site` | `src/app/admin/(panel)/site/page.tsx` | Canvas Canva (`site-canvas-editor.tsx`) |
| `/admin/whatsapp` | `src/app/admin/(panel)/whatsapp/page.tsx` | Conexão Meta Cloud API + bot + logs |
| `/admin/pagamentos` | `src/app/admin/(panel)/pagamentos/page.tsx` | Conta Asaas do salão (API key) |
| `/admin/plano` | `src/app/admin/(panel)/plano/page.tsx` | Assinatura SaaS Barbernegon |
| `/admin/unidades` | `src/app/admin/(panel)/unidades/page.tsx` | CRUD unidades (exclusão só proprietário) |
| `/admin/equipe` | `src/app/admin/(panel)/equipe/page.tsx` | Membros `StaffMember` + senha inicial; por **STAFF**: bio, “Mostrar na home”, **expediente** (`workWeekJson`) para OWNER/ADMIN (`admin-staff-manager.tsx`) |
| `/admin/perfil` | `src/app/admin/(panel)/perfil/page.tsx` | Dados pessoais, foto (Cloudinary), senha |
| `/admin/expediente` | `src/app/admin/(panel)/expediente/page.tsx` | Expediente semanal do **STAFF** (`admin-work-schedule-form.tsx`) |
| `/admin/servicos` | `src/app/admin/(panel)/servicos/page.tsx` | CRUD serviços, filtro por tipo (`ServiceCategory`), cartões |
| `/admin/configuracao` | `src/app/admin/(panel)/configuracao/page.tsx` | Textos `BarbershopSetting` (só proprietário) |
| `/admin/login` | `src/app/admin/login/page.tsx` | Formulário de login |
| `/admin` raiz | `src/app/admin/layout.tsx` | Agrupa `(auth)` e `(panel)` |
| Painel | `src/app/admin/(panel)/layout.tsx` | Navbar + `AdminPanelNav` + gate `getStaffAccessOrNull` |

## API Routes

| Caminho | Arquivo |
|---------|---------|
| Serviços | `src/app/api/services/route.ts` |
| Slots disponíveis | `src/app/api/appointments/available/route.ts` — query opcional `staffMemberId` |
| Criar agendamento | `src/app/api/appointments/route.ts` — body opcional `staffMemberId`; `clientManageToken`; notificação Resend se configurada |
| Gestão pública da reserva | `src/app/api/appointments/manage/[token]/route.ts` — `GET` + `PATCH` (`cancel` / `reschedule`) |
| Dashboard JSON | `src/app/api/admin/dashboard/route.ts` — `chartRange`, `telemetryScope=chart`, filtros `status` / `staff` / `unit` / `q` |
| Export Excel | `src/app/api/admin/export/route.ts` |
| Unidades | `src/app/api/admin/units/route.ts`, `units/[id]/route.ts` |
| Equipe | `src/app/api/admin/staff/route.ts`, `staff/[id]/route.ts`, `staff/[id]/work-schedule/route.ts` — `GET`, `PATCH` (expediente de **STAFF**; `manageStaff` + `canModifyStaffMember`) |
| Serviços admin (lista + criar) | `src/app/api/admin/services/route.ts` — `GET`, `POST` (corpo com `unitId`; unicidade por par **unidade + nome**) |
| Serviço (editar + excluir) | `src/app/api/admin/services/[id]/route.ts` — `PATCH` (opcional `unitId`), `DELETE` |
| Agendamento (atribuir profissional) | `src/app/api/admin/appointments/[id]/route.ts` — `PATCH`, só OWNER/ADMIN |
| Configuração | `src/app/api/admin/settings/route.ts` |
| Login / logout painel | `src/app/api/auth/login/route.ts`, `logout/route.ts` |
| Perfil (dados + senha) | `src/app/api/auth/profile/route.ts` — `PATCH` (próprio usuário) |
| Expediente (funcionário) | `src/app/api/auth/work-schedule/route.ts` — `GET`, `PATCH` (só **STAFF**) |
| Foto de perfil | `src/app/api/auth/profile/avatar/route.ts` — `POST` (multipart `file`), `DELETE` — Cloudinary |
| Web Push (VAPID + subscrição) | `src/app/api/auth/push/config/route.ts` — `GET` (chave pública); `subscribe/route.ts` — `POST` (guardar subscrição), `DELETE` (remover por `endpoint`) — sessão staff |
| Organização (marca + site) | `src/app/api/admin/organization/route.ts` — `GET`, `PATCH` (`siteJson`, `siteTemplate`, branding, `marketplaceListed`) |
| Marketplace (público) | `src/app/api/marketplace/shops/route.ts` — `GET` busca salões listados; `geocode/route.ts` — cidade via GPS; `reviews/route.ts` — `GET` lista publicamente por slug + `POST` avaliação por token |
| Plataforma (ops) | `src/app/api/plataforma/login/route.ts`, `overview`, `organizations`, `marketplace`, `consumidores`, `reviews/[id]` |
| Upload logo/hero/canvas | `src/app/api/admin/organization/brand-asset/route.ts` — `POST` multipart (`kind`: logo \| hero \| canvas) → Cloudinary; canvas/hero aceitam também vídeo (MP4/WebM) |
| WhatsApp admin | `src/app/api/admin/whatsapp/route.ts` — `GET`/`PATCH` (token cifrado, toggle bot) |
| WhatsApp webhook | `src/app/api/webhooks/whatsapp/route.ts` — verify Meta + inbound bot |
| Asaas admin | `src/app/api/admin/payments/route.ts` — `GET`/`PATCH` API key do salão |
| Asaas billing SaaS | `src/app/api/platform/billing/route.ts` — assinatura Starter/Pro; `.../cancel` e `.../undo-cancel` — cancelar / desfazer |
| Asaas webhook | `src/app/api/webhooks/asaas/route.ts` — PIX/assinaturas |
| PIX agendamento | `src/app/api/appointments/[id]/pay-pix/route.ts` |
| Cadastro SaaS | `src/app/api/cadastro/route.ts` — cria org com `siteJson` classic |

## Biblioteca (`src/lib`)

| Arquivo | Responsabilidade |
|---------|------------------|
| `prisma.ts` | Cliente Prisma (adapter pg quando aplicável) |
| `types.ts` | Tipos compartilhados + schema Zod de criação de agendamento |
| `utils.ts` | `cn`, dinheiro, datas, cálculo de slots |
| `br-input-masks.ts` | Máscaras pt-BR (CPF/CNPJ, telefone, dinheiro, CEP, inteiros) |
| `br-phone-format.ts` | Formatação de telefone BR (usado também via `br-input-masks`) |
| `constants.ts` | `BARBER_*` / `HERO_VIDEO_SRC` — **legado piloto + defaults de slots/fuso**; não usar como fallback de branding em `/{slug}` |
| `contact-links.ts` | Helpers legados a partir das constantes (não usados no renderer do tenant) |
| `organization.ts` | `getOrganizationBySlug`, `OrganizationPublic` (inclui `siteJson`), slugs reservados |
| `org-branding.ts` | CSS vars da paleta, slogans neutros, `resolveSiteConfig` |
| `site-page.ts` | Schema v1 legado (`sections[]`) |
| `site-canvas.ts` | Schema v2 canvas, migrate v1→v2, templates, `copyDesktopToMobile` |
| `canvas-layout-grid.ts` | Snap 8px, alinhar frame ao arteboard |
| `marketplace.ts` | Busca de orgs listadas para `/explorar` (server-only) |
| `marketplace-shared.ts` | Tipos/chips seguros para Client Components |
| `marketplace-favorites.ts` | Favoritos em localStorage |
| `public-hosts.ts` | Split marketing vs marketplace (`NEXT_PUBLIC_*_HOST`); URLs por superfície |
| `platform-auth.ts` | Gate Ops (`PLATFORM_ADMIN_EMAILS` / seed); redirect para `/plataforma/login` |
| `platform-ops.ts` | Queries cross-tenant (overview, orgs, marketplace, consumidores) |
| `canvas-page-templates.ts` | Modelos de página completa (14 layouts distintos) |
| `canvas-presets.ts` | Estilos prontos, seções pré-montadas, tipografia |
| `canvas-theme-style.ts` | Tokens CSS do tema do canvas (cliente + servidor) |
| `org-branding.ts` | Resolve canvas + `organizationBrandStyle` (server) |
| `lordicon-cdn-ids.ts` | IDs públicos `cdn.lordicon.com` por slot; `lordicon-server.ts` usa sem API token |
| `data.ts` | `getServices` (catálogo da unidade padrão — home), `getServicesForBooking` (todas as unidades ativas para `/agendar`), `getPublicBarbers`, `getBarbersForBooking`, seed assistido se necessário |
| `barber-card-theme.ts` | Paleta e layout dos cartões da equipe na home (hash estável do `id` do `StaffMember`) |
| `password.ts` | `hashPassword` / `verifyPassword` (bcryptjs) |
| `session-cookie.ts` | Token de sessão, `createDbSession`, resolução por cookie |
| `admin-auth.ts` | `getStaffAccessOrNull` (cache por requisição), `requireStaffApiAuth`, cookies de sessão |
| `staff-access.ts` | Papéis a partir de `StaffMember`, filtros por unidade e por `staffMemberId` (STAFF) |
| `staff-display-names.ts` | Mapa id → rótulo do profissional para tabela admin / export |
| `barbershop-unit.ts` | Resolução da unidade padrão para agendamentos públicos |
| `slug.ts` | `slugify` para slugs de unidades |
| `service-category.ts` | Tipos e rótulos pt-BR do enum `ServiceCategory` (Prisma) |
| `admin-dashboard.ts` | **`getAdminDashboardSnapshot`** com **`appointmentListWhere`** (filtros URL) + lista paginada; **`unitTelemetry`** (OWNER/ADMIN); resumo com valor **confirmados + concluídos** no período |
| `admin-list-url.ts` | Parse de `status` / `staff` / `unit` / `q`, `telemetryScope`, `parseTelemetryScope`, `buildAdminPageHref` (URLs `/admin?…`, seguro para cliente) |
| `admin-appointment-list-where.ts` | `appointmentListWhere` — junta `appointmentScopeWhere` com filtros da lista (só servidor) |
| `cloudinary-server.ts` | Upload/remoção de avatar e **assets de marca** (logo/hero/canvas, incl. vídeo) no Cloudinary (só servidor; requer `CLOUDINARY_*`) |
| `appointment-slot-conflict.ts` | Regras de sobreposição de horário (agendamento geral vs. por profissional); `excludeAppointmentId` na remarcação |
| `public-booking-slot.ts` | Validação compartilhada de slot (expediente, profissional, conflitos) — `POST /api/appointments` e gestão pública |
| `booking-domain.ts` | Criar / cancelar / remarcar / listar por telefone — site e bot WhatsApp |
| `whatsapp-meta-client.ts` / `whatsapp-crypto.ts` / `whatsapp-bot-fsm.ts` / `whatsapp-notify-client.ts` / `whatsapp-reminders.ts` | Cloud API Meta, criptografia de token, FSM do bot, outbound, cron de lembretes |
| `asaas-client.ts` / `asaas-crypto.ts` / `asaas-webhook.ts` / `asaas-plans.ts` / `asaas-org.ts` / `org-entitlements.ts` / `club-subscribe.ts` | Gateway Asaas, billing SaaS, PIX/clube (adesão + QR), gates de plano |
| `client-manage-token.ts` | Formato UUID do token de gestão da reserva (`/minha-reserva/...`) |
| `notify-barber-booking.ts` | Envio de e-mail via Resend ao barbeiro atribuído (`RESEND_*`) |
| `work-week.ts` | Expediente semanal do barbeiro (`workWeekJson`), interseção com horário da loja |

## Componentes UI relevantes

| Componente | Pasta |
|------------|-------|
| Site do tenant (canvas) | `tenant-canvas-renderer.tsx` |
| Nav pública (landing + explorar) | `brand/barbernegon-nav.tsx`, `brand/barbernegon-footer.tsx`, `brand/public-brand-shell.tsx`, `brand/brand-page-transition.tsx` |
| Landing B2B | `landing/barbernegon-landing.tsx`, `landing/stitch-sections.tsx`, `landing/ln-tokens.ts` — assets em `public/images/landing/` |
| Marketplace | `marketplace/explore-marketplace-client.tsx`, `explore-chrome.tsx`, `explore-hero-carousel.tsx`, `shop-card.tsx`, `favorites-shops-list.tsx` |
| Plataforma Ops | `plataforma/platform-sidebar.tsx`, `platform-login-form.tsx`, `platform-org-editor.tsx`, `platform-review-actions.tsx` |
| Editor canvas | `site-canvas/site-canvas-editor.tsx`, `canvas-studio-parts.tsx` (desktop 3 colunas; mobile dock + folhas; barra flutuante Canva-lite; cores via `color-wheel-field.tsx`) |
| Editor de identidade | `brand-editor-form.tsx` |
| WhatsApp admin | `whatsapp-admin-panel.tsx` |
| Pagamentos admin | `payments-admin-panel.tsx` |
| PIX pós-agendar | `appointment-pix-pay.tsx` |
| Navbar (menu mobile ecrã completo + animações, redes, Painel) | `src/components/navbar.tsx`, `navbar-client.tsx` |
| Hero, seções animadas | `hero.tsx`, `hero-video.tsx`, `animated-section.tsx`, `section-title.tsx`, `home-barbers-grid.tsx`, `home-services-grid.tsx`, `home-contact-grid.tsx` |
| Formulário agendamento | `booking-form.tsx` |
| Gestão reserva (cliente) | `manage-reservation-client.tsx` |
| Painel | `admin-panel-nav.tsx`, `admin-table.tsx`, `admin-appointment-filters-form.tsx`, `admin-pagination.tsx`, `admin-export-button.tsx`, `dashboard-period-tabs.tsx`, `dashboard-telemetry-scope-tabs.tsx`, `dashboard-unit-telemetry.tsx`, `dashboard-volume-area.tsx`, `dashboard-revenue-line.tsx`, `dashboard-payment-stack.tsx`, `dashboard-status-pie.tsx`, `dashboard-services-bar-chart.tsx`, `dashboard-summary-table.tsx`, `admin-units-manager.tsx`, `admin-staff-manager.tsx`, `admin-services-manager.tsx`, `admin-settings-manager.tsx`, `admin-profile-form.tsx`, `admin-work-schedule-form.tsx` |
| Mapa (contato) | `location-map.tsx` (só renderiza com query/endereço da unidade) |
| Aviso BD offline | `database-unavailable-notice.tsx` |
| Logo do tenant | `brand-logo.tsx` — placeholder de letra se sem `logoUrl` (**não** cai em `logo.jpeg` do piloto) |
| Ícones de marca (WhatsApp / Instagram) | `src/components/icons/whatsapp-icon.tsx`, `instagram-icon.tsx`, `index.ts` |

## Prisma

| Arquivo | Função |
|---------|--------|
| `prisma/schema.prisma` | `Organization` (+ `siteJson`), `Service`, `Appointment`, `BarbershopUnit`, `StaffMember`, `Session`, `BarbershopSetting`, enums |
| `prisma/seed.ts` | Serviços + unidade matriz + proprietário inicial + `unitId` em agendamentos sem unidade |
| `prisma.config.ts` | Configuração Prisma 7 (se presente) |

## Autenticação e proxy

| Arquivo | Função |
|---------|--------|
| `src/proxy.ts` | Next.js 16 **proxy**: legado `/agendar`; rewrite/redirect por Host quando marketing + marketplace hosts estão definidos |
| `src/lib/public-hosts.ts` | Helpers de superfície B2B vs consumidor |
| `src/app/layout.tsx` | Layout raiz, fontes (Geist + display), sem provider de terceiros para auth |

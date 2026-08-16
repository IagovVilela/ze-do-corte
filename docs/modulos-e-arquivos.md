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
| `src/lib/ensure-owner-with-prisma.ts` | Lógica idempotente OWNER a partir de `SEED_OWNER_*` (script + `instrumentation`); chama demo staff |
| `src/lib/ensure-demo-staff-with-prisma.ts` | Contas demo `gerente@zdc.local` (ADMIN) + `barbeiro@zdc.local` (STAFF) |
| `src/lib/admin-morning-briefing.ts` | Briefing matinal OWNER/ADMIN: prioridades ranqueadas + facts JSON + ação primária |
| `src/lib/morning-briefing-ai.ts` | Narrativa do briefing (LLM opcional + fallback regras + cache diário) |
| `src/lib/admin-right-hand.ts` / `admin-right-hand-types.ts` | Motor Braço Direito (snapshot + cache) |
| `src/lib/right-hand-metrics.ts` | Agregações puras (KPIs, funil, coorte, deltas) + testes Vitest |
| `src/lib/right-hand-confidence.ts` | Limiares / selo “poucos dados” |
| `src/lib/right-hand-actions.ts` | Fila de ação por impacto R$ |
| `src/lib/right-hand-health.ts` | Semáforos Visão Geral |
| `src/lib/right-hand-ai.ts` | Insights narrativos (LLM ou regras) |
| `src/lib/right-hand-chat-ai.ts` | Chat consultivo com facts do tenant |
| `src/lib/client-profile.ts` / `client-profile-math.ts` | Perfil por telefone, intervalo usual, fila de reativação |
| `src/lib/whatsapp-agent-ai.ts` | Texto livre Plus+: tools de slot/reserva (sem inventar horário) |
| `src/lib/reports-period-ai.ts` | Leitura IA do período em Relatórios |
| `src/instrumentation.ts` | Produção: reforço da criação do OWNER no arranque do Next |
| `src/lib/observability.ts` | Logs JSON + `captureException` → Sentry |
| `src/lib/staff-auth-lookup.ts` | Login staff: busca por e-mail via SQL (`findStaffAuthByEmail`) |
| `src/lib/support-consultant.ts` | Org interna de consultores, CRUD SQL e log de assistência |
| `src/instrumentation.ts` / `instrumentation-client.ts` | Init Sentry (server/edge/client) |
| `src/sentry.server.config.ts` / `sentry.edge.config.ts` | `Sentry.init` por runtime |
| `src/app/global-error.tsx` | Erros React App Router → Sentry |
| `src/components/analytics-provider.tsx` | PostHog opcional (`NEXT_PUBLIC_POSTHOG_KEY`) |
| `INICIAR_APLICACAO.bat` | Legado: outro projeto Laravel em `reviews-platform` (não é este app) |

## App Router — páginas

| Rota | Arquivo | Notas |
|------|---------|--------|
| `/` | `src/app/(public)/page.tsx` | Landing **Barbernegon** premium (shell em `(public)/layout.tsx`) |
| `/planos` | `src/app/(public)/planos/page.tsx` | Planos Free + Pro + Plus+ |
| `/explorar` | `src/app/(public)/explorar/page.tsx` | Marketplace: busca salões → site/`agendar` do tenant |
| `/explorar/favoritos` | `src/app/(public)/explorar/favoritos/page.tsx` | Favoritos salvos neste aparelho |
| `/plataforma/login` | `src/app/plataforma/login/page.tsx` | Login exclusivo Ops (`?k=` → gate API) |
| `/consultores/login` | `src/app/consultores/login/page.tsx` | Login consultores (`?k=SUPPORT_CONSULTANT_GATE`) |
| `/consultores` | `src/app/consultores/(console)/page.tsx` | Inbox de chamados + assistência |
| `/plataforma/consultores` | `src/app/plataforma/(ops)/consultores/page.tsx` | Ops cria/desativa consultores + auditoria |
| `/plataforma` | `src/app/plataforma/(ops)/page.tsx` | Ops: overview com KPIs, taxas e gráficos (7d/30d) |
| `/plataforma/barbearias` | `src/app/plataforma/(ops)/barbearias/page.tsx` | Lista de orgs |
| `/plataforma/barbearias/[id]` | `src/app/plataforma/(ops)/barbearias/[id]/page.tsx` | Detalhe + plano + entrar como dono + excluir |
| `/plataforma/marketplace` | `src/app/plataforma/(ops)/marketplace/page.tsx` | Listagens + reviews |
| `/plataforma/consumidores` | `src/app/plataforma/(ops)/consumidores/page.tsx` | Agendamentos cross-tenant |
| `/cadastro` | `src/app/cadastro/page.tsx` | Cria org + OWNER + unidade + `siteJson` template classic (`auth/cadastro-client.tsx`) |
| `/planos` | `src/app/(public)/planos/page.tsx` | Comparação Free / Pro / Plus+ + trial |
| `/condicoes` | `src/app/(public)/condicoes/page.tsx` | Lista Termos, Privacidade e PDFs informativos |
| `/termos` | `src/app/(public)/termos/page.tsx` | Termos de Uso da plataforma |
| `/privacidade` | `src/app/(public)/privacidade/page.tsx` | Política de Privacidade (LGPD) |
| `/lista-espera` | `src/app/lista-espera/page.tsx` | Lead B2B só por link (noindex); form `lista-espera-form.tsx` |
| `/[slug]` | `src/app/[slug]/page.tsx` + `layout.tsx` | Site institucional via canvas + PWA (**Instalar app**) |
| `/[slug]/agendar` | `src/app/[slug]/agendar/page.tsx` | Agendamento scoped à org (+ PWA do tenant) |
| `/agendar` | `src/app/agendar/page.tsx` | Legado → redirect tenant seed |
| `/minha-reserva/[token]` | `src/app/minha-reserva/[token]/page.tsx` | Cliente altera/cancela sem login (`manage-reservation-client.tsx`) |
| `/admin` | `src/app/admin/(panel)/page.tsx` | Briefing matinal (OWNER/ADMIN) + dashboard + métricas + gráficos + **Resumo operacional** (filtros GET) + tabela + paginação `?page=` |
| `/admin/agendamentos` | `src/app/admin/(panel)/agendamentos/page.tsx` | Frequência (heatmap) + calendário com blocos/comanda |
| `/admin/relatorios` | `src/app/admin/(panel)/relatorios/page.tsx` | Overview + leitura IA do período (`AdminReportsPeriodAi`) |
| `/admin/inteligencia` | `src/app/admin/(panel)/inteligencia/page.tsx` | **Braço Direito**: KPIs do período, funil, coorte, heatmap, chat, retenção WhatsApp |
| `/admin/evolucao` | `src/app/admin/(panel)/evolucao/page.tsx` | Monitoramento de evolução (faturamento, retorno, crescimento) |
| `/admin/operacional` | `src/app/admin/(panel)/operacional/page.tsx` | Filas do dia; `#a-receber` com registrar pagamento |
| `/admin/avaliacoes` | `src/app/admin/(panel)/avaliacoes/page.tsx` | Feedback dos clientes (`OrganizationReview`) |
| `/admin/clientes` | `src/app/admin/(panel)/clientes/page.tsx` | CRM: clientes únicos (agenda + clube) |
| `/admin/produtos` | `src/app/admin/(panel)/produtos/page.tsx` | Catálogo de produtos (comanda) |
| `/admin/marca` | `src/app/admin/(panel)/marca/page.tsx` | Identidade (logo, slug, redes) |
| `/admin/site` | `src/app/admin/(panel)/site/page.tsx` | Canvas Canva (`site-canvas-editor.tsx`) |
| `/admin/whatsapp` | `src/app/admin/(panel)/whatsapp/page.tsx` | Conexão Meta Cloud API + bot + logs |
| `/admin/pagamentos` | `src/app/admin/(panel)/pagamentos/page.tsx` | Conta Asaas do salão (API key) |
| `/admin/financeiro/comissoes` | `…/financeiro/comissoes/page.tsx` | Comissões + metas do mês + regras/faixas escalonadas |
| `/admin/financeiro/balanco` | `…/financeiro/balanco/page.tsx` | Balanço do período |
| `/admin/financeiro/contas-a-pagar` | `…/financeiro/contas-a-pagar/page.tsx` | Despesas em aberto |
| `/admin/financeiro/contas-a-receber` | `…/financeiro/contas-a-receber/page.tsx` | Receitas em aberto |
| `/admin/financeiro/criar-despesa` | `…/financeiro/criar-despesa/page.tsx` | Formulário de despesa |
| `/admin/financeiro/criar-receita` | `…/financeiro/criar-receita/page.tsx` | Formulário de receita |
| `/admin/plano` | `src/app/admin/(panel)/plano/page.tsx` | Assinatura SaaS Barbernegon |
| `/admin/condicoes` | `src/app/admin/(panel)/condicoes/page.tsx` | Informativos e páginas legais para o dono |
| `/admin/unidades` | `src/app/admin/(panel)/unidades/page.tsx` | CRUD unidades (exclusão só proprietário) |
| `/admin/equipe` | `src/app/admin/(panel)/equipe/page.tsx` | Membros `StaffMember` + senha inicial; por **STAFF**: bio, “Mostrar na home”, **expediente** (`workWeekJson`) para OWNER/ADMIN (`admin-staff-manager.tsx`) |
| `/admin/perfil` | `src/app/admin/(panel)/perfil/page.tsx` | Dados pessoais, foto (Cloudinary), senha |
| `/admin/expediente` | `src/app/admin/(panel)/expediente/page.tsx` | Expediente semanal do **STAFF** (`admin-work-schedule-form.tsx`) |
| `/admin/servicos` | `src/app/admin/(panel)/servicos/page.tsx` | CRUD serviços, filtro por tipo (`ServiceCategory`), cartões |
| `/admin/configuracao` | `src/app/admin/(panel)/configuracao/page.tsx` | Preferências: aparência (todos), toggles de funções (OWNER/branding), textos `BarbershopSetting` (OWNER) |
| `/admin/login` | `src/app/admin/login/page.tsx` | Login premium do painel (`admin-login-form.tsx` + `auth/`) |
| `/admin/esqueci-senha` | `src/app/admin/esqueci-senha/page.tsx` | Pedido de link de redefinição (`forgot-password-form.tsx`) |
| `/admin/redefinir-senha` | `src/app/admin/redefinir-senha/page.tsx` | Nova senha via token do e-mail (`reset-password-form.tsx`) |
| `/admin` raiz | `src/app/admin/layout.tsx` | Agrupa `(auth)` e `(panel)` |
| Painel | `src/app/admin/(panel)/layout.tsx` | Navbar + `AdminPanelNav` (logo/nome da org) + gate `getStaffAccessOrNull` + tema claro/escuro (`AdminThemeProvider`) + manifest PWA admin + botão instalar |
| Nav config | `src/lib/admin-nav-config.ts` | Grupos, keywords de busca, filtros e match de rota ativa |

## API Routes

| Caminho | Arquivo |
|---------|---------|
| Serviços | `src/app/api/services/route.ts` |
| Slots disponíveis | `src/app/api/appointments/available/route.ts` — `serviceIds`, duração total, capacidade por barbeiro |
| Serviços mais pedidos | `src/app/api/appointments/popular-services/route.ts` — ranking público por org/unidade |
| Agenda inteligente | `src/lib/booking-availability.ts` — soma duração, bloco contínuo, auto-sugestão de profissional |
| Criar agendamento | `src/app/api/appointments/route.ts` — body opcional `staffMemberId`; `clientManageToken`; notificação Resend se configurada |
| Gestão pública da reserva | `src/app/api/appointments/manage/[token]/route.ts` — `GET` + `PATCH` (`cancel` / `reschedule`) |
| Dashboard JSON | `src/app/api/admin/dashboard/route.ts` — `chartRange`, `telemetryScope=chart`, filtros `status` / `staff` / `unit` / `q` |
| Briefing narrativa | `src/app/api/admin/morning-briefing/narrative/route.ts` — `POST` gera resumo (IA ou regras); `GET` status `aiConfigured` |
| WhatsApp draft IA | `src/app/api/admin/ai/whatsapp-draft/route.ts` — `POST` mensagem curta (winback/clube); sem telefone no payload |
| Relatórios narrativa | `src/app/api/admin/ai/reports-narrative/route.ts` — `POST` leitura do período + 3 ações |
| Braço Direito | `src/app/api/admin/right-hand/route.ts` — `GET` snapshot; `src/app/api/admin/ai/right-hand/route.ts` — `POST` análise; `src/app/api/admin/ai/right-hand-chat/route.ts` — chat; `src/app/api/admin/whatsapp/approve-send/route.ts` — envio aprovado |
| Export Excel | `src/app/api/admin/export/route.ts` — agenda completa; `?pack=month&yearMonth=AAAA-MM` pacote mensal (XLSX multi-aba) |
| Metas mensais | `src/app/api/admin/goals/route.ts` — `GET`/`PUT` (`StaffMonthlyGoal`) |
| Financeiro | `src/app/api/admin/finance/entries`, `categories`, `balance`, `commissions`, `commission-rules` (`tiersJson`) |
| Evolução | `src/app/api/admin/evolution/route.ts` |
| Unidades | `src/app/api/admin/units/route.ts`, `units/[id]/route.ts` |
| Equipe | `src/app/api/admin/staff/route.ts`, `staff/[id]/route.ts`, `staff/[id]/work-schedule/route.ts` — `GET`, `PATCH` (expediente de **STAFF**; `manageStaff` + `canModifyStaffMember`) |
| Serviços admin (lista + criar) | `src/app/api/admin/services/route.ts` — `GET`, `POST` (corpo com `unitId`; unicidade por par **unidade + nome**) |
| Serviço (editar + excluir) | `src/app/api/admin/services/[id]/route.ts` — `PATCH` (opcional `unitId`), `DELETE` |
| Agendamentos (lista por intervalo) | `src/app/api/admin/appointments/route.ts` — `GET ?from=&to=` (AAAA-MM-DD) |
| Agendamentos (frequência / heatmap) | `src/app/api/admin/appointments/frequency/route.ts` — `GET ?unit=&staff=&from=&to=&chartRange=` (`from`/`to` AAAA-MM-DD têm prioridade; senão `chartRange`; senão últimos 30 dias; intervalo máx. 366 dias) |
| Comanda | `src/app/api/admin/appointments/[id]/comanda/route.ts` — `GET`/`PATCH` (serviços, produtos, pago) |
| Produtos | `src/app/api/admin/products/route.ts` + `[id]` |
| Relatórios | `src/app/api/admin/reports/route.ts` |
| Operacional | `src/app/api/admin/ops/route.ts` |
| Avaliações | `src/app/api/admin/reviews/route.ts` — `GET ?rating=&page=` |
| Clientes (CRM) | `src/app/api/admin/clients/route.ts` — `GET ?q=&club=&sort=&page=` |
| Histórico cliente (público) | `src/app/api/appointments/client-history/route.ts` |
| Agendamento (atribuir profissional) | `src/app/api/admin/appointments/[id]/route.ts` — `PATCH`, só OWNER/ADMIN |
| Configuração | `src/app/api/admin/settings/route.ts` |
| Login / logout painel | `src/app/api/auth/login/route.ts`, `logout/route.ts` |
| Esqueci / redefinir senha | `src/app/api/auth/forgot-password/route.ts`, `reset-password/route.ts` |
| Perfil (dados + senha) | `src/app/api/auth/profile/route.ts` — `PATCH` (próprio usuário) |
| Expediente (funcionário) | `src/app/api/auth/work-schedule/route.ts` — `GET`, `PATCH` (só **STAFF**) |
| Foto de perfil | `src/app/api/auth/profile/avatar/route.ts` — `POST` (multipart `file`), `DELETE` — Cloudinary |
| Web Push (VAPID + subscrição) | `src/app/api/auth/push/config/route.ts` — `GET` (chave pública); `subscribe/route.ts` — `POST` (guardar subscrição), `DELETE` (remover por `endpoint`) — sessão staff |
| PWA manifest (tenant / admin API) | `src/app/api/public/pwa-manifest/[slug]/route.ts` — `GET` JSON (`admin` ou slug da org); painel também usa `public/admin-manifest.webmanifest` |
| Organização (marca + site) | `src/app/api/admin/organization/route.ts` — `GET`, `PATCH` (`siteJson`, `siteTemplate`, branding, `marketplaceListed`) |
| QR do site (painel) | `src/app/api/admin/shop-qr/route.ts` — `GET` PNG do QR do `/{slug}` |
| Marketplace (público) | `src/app/api/marketplace/shops/route.ts` — `GET` busca salões listados; `geocode/route.ts` — cidade via GPS; `reviews/route.ts` — `GET` lista publicamente por slug + `POST` avaliação por token |
| Plataforma (ops) | `gate` / `ops-gate` (cookie), `login`, `overview`, `organizations` (PATCH/DELETE), `organizations/[id]/impersonate`, `impersonate/return`, `marketplace`, `consumidores`, `reviews/[id]` |
| Upload logo/hero/canvas | `src/app/api/admin/organization/brand-asset/route.ts` — `POST` multipart (`kind`: logo \| hero \| canvas) → Cloudinary; limites em `media-upload-limits.ts` (imagem 30 MB / vídeo 60 MB) |
| Foto de perfil | `src/app/api/auth/profile/avatar/route.ts` — JPEG/PNG/WebP até 30 MB |
| WhatsApp admin | `src/app/api/admin/whatsapp/route.ts` — `GET`/`PATCH` (token cifrado, toggle bot, confirmação e lembrete 24h) |
| WhatsApp webhook | `src/app/api/webhooks/whatsapp/route.ts` — verify Meta + inbound bot (idempotência `WhatsAppInboundDedup`) |
| WhatsApp reativação Plus+ | `src/app/api/admin/whatsapp/winback/route.ts` — `GET` fila / `POST` aprovar template |
| Suporte admin | `src/app/api/admin/support/contact`, `…/tickets`, `…/tickets/[id]/messages` |
| Suporte plataforma | `src/app/api/platform/support/tickets`, `…/[id]`, `…/[id]/messages` |
| Asaas admin | `src/app/api/admin/payments/route.ts` — `GET`/`PATCH` API key do salão |
| Clientes que já agendaram | `src/app/api/admin/booking-clients/route.ts` — `GET` (únicos por telefone; usado no clube balcão) |
| Asaas billing SaaS | `src/app/api/platform/billing/route.ts` — assinatura Pro/Plus+ (Free sem cobrança); `.../cancel` e `.../undo-cancel`; Free: máx. 2 STAFF + 1 unidade (`org-entitlements`) |
| Asaas webhook | `src/app/api/webhooks/asaas/route.ts` — PIX/assinaturas |
| PIX agendamento | `src/app/api/appointments/[id]/pay-pix/route.ts` |
| Cadastro SaaS | `src/app/api/cadastro/route.ts` — cria org com `siteJson` classic |
| Leads B2B | `src/app/api/leads/route.ts` — `POST` público; lista Ops em `/plataforma/leads` |

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
| `public-hosts.ts` | Split marketing vs marketplace (`NEXT_PUBLIC_*_HOST`); URLs por superfície; `shopPublicAbsoluteUrl` |
| `platform-auth.ts` | Gate Ops (`PLATFORM_ADMIN_EMAILS` / seed); redirect para `/plataforma/login` |
| `pwa-manifest.ts` | Monta web app manifest (tenant ou painel) para instalação PWA |
| `platform-ops.ts` | Queries cross-tenant (overview, orgs, marketplace, consumidores) |
| `canvas-page-templates.ts` | Modelos de página completa (15 layouts; inclui **`vitrine`** da demo Barbergon) |
| `canvas-presets.ts` | Estilos prontos, seções pré-montadas, tipografia |
| `canvas-theme-style.ts` | Tokens CSS do tema do canvas (cliente + servidor) |
| `org-branding.ts` | Resolve canvas + `organizationBrandStyle` (server) |
| `lordicon-cdn-ids.ts` / `lordicon-server.ts` | Ícones: API (token) → CDN → JSON local `src/data/lordicon/` |
| `data.ts` | `getServices` (catálogo da unidade padrão — home), `getServicesForBooking` (todas as unidades ativas para `/agendar`), `getPublicBarbers`, `getBarbersForBooking`, seed assistido se necessário |
| `popular-services.ts` | Ranking dos serviços mais pedidos (comanda / legado) para o agendar público |
| `barber-card-theme.ts` | Paleta e layout dos cartões da equipe na home (hash estável do `id` do `StaffMember`) |
| `password.ts` | `hashPassword` / `verifyPassword` (bcryptjs) |
| `password-reset.ts` | Token SHA-256 + e-mail Resend para “esqueci minha senha” |
| `session-cookie.ts` | Token de sessão, `createDbSession`, resolução por cookie |
| `admin-auth.ts` | `getStaffAccessOrNull` (cache por requisição), `requireStaffApiAuth`, cookies de sessão |
| `staff-access.ts` | Papéis a partir de `StaffMember`, filtros por unidade e por `staffMemberId` (STAFF) |
| `staff-display-names.ts` | Mapa id → rótulo do profissional para tabela admin / export |
| `barbershop-unit.ts` | Resolução da unidade padrão para agendamentos públicos |
| `slug.ts` | `slugify` para slugs de unidades |
| `service-category.ts` | Tipos e rótulos pt-BR do enum `ServiceCategory` (Prisma) |
| `admin-dashboard.ts` | **`getAdminDashboardSnapshot`** com **`appointmentListWhere`** (filtros URL) + lista paginada; **`unitTelemetry`** (OWNER/ADMIN); resumo com valor **confirmados + concluídos** no período |
| `admin-appointments.ts` | **`listAdminAppointmentsInRange`** para o calendário (máx. 31 dias) |
| `admin-appointment-frequency.ts` | Heatmap de ocupação por weekday×hora (`fromYmd`/`toYmd`, `from`/`to` ou últimos 30 dias) |
| `admin-appointment-comanda.ts` | Detalhe da comanda + histórico/recompra |
| `admin-reports.ts` | Snapshot completo de Relatórios |
| `admin-finance.ts` | Lançamentos, categorias, balanço do salão |
| `admin-commissions.ts` | Cálculo de comissões (faixas `tiersJson`) + gerar contas a pagar |
| `commission-tiers.ts` | Parse/resolve de faixas escalonadas de % serviço |
| `admin-export-month.ts` | Pacote XLSX mensal (faturamento, ranking, serviços, CRM, clube) |
| `club-health.ts` | Calculadora de preço do plano + buckets de saúde do clube |
| `admin-evolution.ts` / `admin-evolution-types.ts` | Snapshot de evolução do salão (faturamento, retorno, KPIs) |
| `admin-ops.ts` | Snapshot do Operacional (filas do dia) |
| `admin-list-url.ts` | Parse de `status` / `staff` / `unit` / `q`, `telemetryScope`, `parseTelemetryScope`, `buildAdminPageHref` (URLs `/admin?…`, seguro para cliente) |
| `admin-appointment-list-where.ts` | `appointmentListWhere` — junta `appointmentScopeWhere` com filtros da lista (só servidor) |
| `cloudinary-server.ts` | Upload/remoção de avatar e **assets de marca** (logo/hero/canvas, incl. vídeo) no Cloudinary (só servidor; requer `CLOUDINARY_*`) |
| `appointment-slot-conflict.ts` | Regras de sobreposição de horário (agendamento geral vs. por profissional); `excludeAppointmentId` na remarcação |
| `booking-availability.ts` | Motor de disponibilidade: duração multi-serviço, capacidade da equipe, slots que cabem inteiros |
| `public-booking-slot.ts` | Validação compartilhada de slot (expediente, profissional, conflitos, auto-atribuição) — `POST /api/appointments` e gestão pública |
| `booking-domain.ts` | Criar / cancelar / remarcar / listar por telefone — site e bot WhatsApp |
| `whatsapp-meta-client.ts` / `whatsapp-crypto.ts` / `whatsapp-bot-fsm.ts` / `whatsapp-notify-client.ts` / `whatsapp-reminders.ts` | Cloud API Meta, criptografia de token, FSM do bot, outbound, cron de lembretes |
| `asaas-client.ts` / `asaas-crypto.ts` / `asaas-webhook.ts` / `asaas-plans.ts` / `asaas-org.ts` / `org-entitlements.ts` / `club-subscribe.ts` / `club-subscription-actions.ts` / `club-notify-client.ts` | Gateway Asaas, billing SaaS, PIX/clube (adesão, pausar/reativar/postergar/cancelar + aviso WhatsApp/e-mail), gates de plano |
| `support.ts` / `support-articles.ts` | Contato (env), labels de ticket, artigos da central de ajuda |
| `client-manage-token.ts` | Formato UUID do token de gestão da reserva (`/minha-reserva/...`) |
| `notify-barber-booking.ts` | Envio de e-mail via Resend ao barbeiro atribuído (`RESEND_*`) |
| `work-week.ts` | Expediente semanal do barbeiro (`workWeekJson`), interseção com horário da loja |

## Componentes UI relevantes

| Componente | Pasta |
|------------|-------|
| Site do tenant (canvas) | `tenant-canvas-renderer.tsx` |
| Auth (login + cadastro + reset) | `auth/auth-shell.tsx`, `auth/auth-fields.tsx`, `auth/cadastro-client.tsx`, `admin-login-form.tsx`, `forgot-password-form.tsx`, `reset-password-form.tsx` |
| Tokens corporativos BN | `lib/brand-tokens.ts` (`BN` / `BN_LIGHT`) + classe `.brand-onyx` em `globals.css` (marketing/auth/planos/**chrome admin**; light via `data-theme`) |
| Tema do painel | `lib/admin-theme.ts`, `admin-theme-provider.tsx`, `admin-theme-toggle.tsx`, `admin-config-appearance.tsx` |
| Nav pública (landing + explorar + planos) | `brand/barbernegon-nav.tsx`, `brand/barbernegon-footer.tsx`, `brand/public-brand-shell.tsx`, `brand/brand-page-transition.tsx` |
| Landing B2B | `landing/barbernegon-landing.tsx`, `landing/stitch-sections.tsx` — assets em `public/images/landing/` |
| Planos SaaS (UI) | `saas-plan-comparison.tsx` (também em `/admin/plano`) |
| Marketplace | `marketplace/explore-marketplace-client.tsx`, `explore-chrome.tsx`, `explore-hero-carousel.tsx`, `shop-card.tsx`, `favorites-shops-list.tsx` |
| Plataforma Ops | `plataforma/platform-sidebar.tsx`, `platform-login-form.tsx`, `platform-org-editor.tsx`, `platform-org-actions.tsx`, `ops-impersonation-banner.tsx`, `platform-review-actions.tsx` |
| Editor canvas | `site-canvas/site-canvas-editor.tsx`, `canvas-studio-parts.tsx`, `canvas-confirm-modal.tsx`, `canvas-layers-panel.tsx`, `canvas-onboarding.tsx`, `canvas-phone-preview.tsx` (chrome BN; desktop 3 colunas + abas Biblioteca/Camadas; mobile dock + folhas; preview celular; onboarding por modelos) |
| Editor de identidade | `brand-editor-form.tsx` |
| WhatsApp admin | `whatsapp-admin-panel.tsx` (checklist + toggles confirmação/lembrete) |
| Clube admin | `club-admin-panel.tsx` (sugerir preço + saúde do clube) |
| Metas / regras comissão | `admin-goals-panel.tsx`, `admin-commission-rules-panel.tsx` |
| PWA (painel + site/agendar) | `pwa-install-button.tsx`, `pwa-client-install-bar.tsx`, `pwa-agendar-install-card.tsx`, `pwa-register.tsx`, `admin-pwa-install-button.tsx`, hook `use-pwa-install.ts`; manifests `public/admin-manifest.webmanifest` + API tenant; SW `public/sw.js` |
| Pagamentos admin | `payments-admin-panel.tsx` |
| Suporte admin | `support-admin-panel.tsx` (`/admin/suporte`) |
| Suporte Ops | `plataforma/support-platform-panel.tsx` (`/plataforma/suporte`) |
| Leads Ops | `src/app/plataforma/(ops)/leads/page.tsx` — tabela de `PlatformLead` |
| PIX pós-agendar | `appointment-pix-pay.tsx` |
| Navbar (menu mobile ecrã completo + animações, redes, Painel) | `src/components/navbar.tsx`, `navbar-client.tsx` |
| Hero, seções animadas | `hero.tsx`, `hero-video.tsx`, `animated-section.tsx`, `section-title.tsx`, `home-barbers-grid.tsx`, `home-services-grid.tsx`, `home-contact-grid.tsx` |
| Formulário agendamento | `booking-form.tsx` |
| Gestão reserva (cliente) | `manage-reservation-client.tsx` |
| Painel | `admin-panel-nav.tsx` (grupos BN), `admin-page-header.tsx`, `admin-morning-briefing.tsx`, `admin-morning-briefing-ai.tsx`, `admin-right-hand-insights.tsx`, `admin-right-hand-compare-bars.tsx`, `admin-right-hand-retention.tsx`, `admin-ops-unpaid-list.tsx`, `admin-whatsapp-draft-button.tsx`, `admin-reports-period-ai.tsx`, `admin-config-appearance.tsx`, `admin-config-feature-toggles.tsx`, `onboarding-checklist.tsx`, `admin-table.tsx`, `admin-appointment-frequency-heatmap.tsx`, `admin-appointments-calendar.tsx`, `admin-appointment-comanda-sheet.tsx`, `admin-products-manager.tsx`, `admin-date-range-picker.tsx`, `admin-appointment-filters-form.tsx`, `admin-pagination.tsx`, `admin-export-button.tsx`, `dashboard-period-tabs.tsx`, `dashboard-telemetry-scope-tabs.tsx`, `dashboard-unit-telemetry.tsx`, `dashboard-volume-area.tsx`, `dashboard-revenue-line.tsx`, `dashboard-payment-stack.tsx`, `dashboard-status-pie.tsx`, `dashboard-services-bar-chart.tsx`, `dashboard-summary-table.tsx`, `admin-units-manager.tsx`, `admin-staff-manager.tsx`, `admin-services-manager.tsx`, `admin-settings-manager.tsx`, `admin-profile-form.tsx`, `admin-work-schedule-form.tsx` |
| Mapa (contato) | `location-map.tsx` (só renderiza com query/endereço da unidade) |
| Aviso BD offline | `database-unavailable-notice.tsx` |
| Logo do tenant | `brand-logo.tsx` — placeholder de letra se sem `logoUrl` (**não** cai em `logo.jpeg` do piloto) |
| Ícones de marca (WhatsApp / Instagram) | `src/components/icons/whatsapp-icon.tsx`, `instagram-icon.tsx`, `index.ts` |

## Prisma

| Arquivo | Função |
|---------|--------|
| `prisma/schema.prisma` | `Organization` (+ `siteJson`), `Service`, `Appointment`, `BarbershopUnit`, `StaffMember`, `Session`, `BarbershopSetting`, enums |
| `prisma/seed.ts` | Serviços + unidade matriz + proprietário + demo ADMIN/STAFF + `unitId` em agendamentos sem unidade |
| `prisma.config.ts` | Configuração Prisma 7 (se presente) |

## Autenticação e proxy

| Arquivo | Função |
|---------|--------|
| `src/proxy.ts` | Next.js 16 **proxy**: legado `/agendar`; rewrite/redirect por Host quando marketing + marketplace hosts estão definidos |
| `src/lib/public-hosts.ts` | Helpers de superfície B2B vs consumidor |
| `src/app/layout.tsx` | Layout raiz, fontes (Geist + display), sem provider de terceiros para auth |

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
| `/` | `src/app/page.tsx` | Institucional, serviços do DB; secção **Equipe** (`#equipe`) se houver barbeiros em destaque |
| `/agendar` | `src/app/agendar/page.tsx` | Agendamento |
| `/minha-reserva/[token]` | `src/app/minha-reserva/[token]/page.tsx` | Cliente altera/cancela sem login (`manage-reservation-client.tsx`) |
| `/admin` | `src/app/admin/(panel)/page.tsx` | Dashboard + métricas + gráficos + **Resumo operacional** (filtros GET) + tabela + paginação `?page=` |
| `/admin/unidades` | `src/app/admin/(panel)/unidades/page.tsx` | CRUD unidades (exclusão só proprietário) |
| `/admin/equipe` | `src/app/admin/(panel)/equipe/page.tsx` | Membros `StaffMember` + senha inicial; por **STAFF**: bio, “Mostrar na home”, **expediente** (`workWeekJson`) para OWNER/ADMIN (`admin-staff-manager.tsx`) |
| `/admin/perfil` | `src/app/admin/(panel)/perfil/page.tsx` | Dados pessoais, foto (Cloudinary), senha |
| `/admin/expediente` | `src/app/admin/(panel)/expediente/page.tsx` | Expediente semanal do **STAFF** (`admin-work-schedule-form.tsx`) |
| `/admin/servicos` | `src/app/admin/(panel)/servicos/page.tsx` | CRUD serviços, filtro por tipo (`ServiceCategory`), cartões |
| `/admin/configuracao` | `src/app/admin/(panel)/configuracao/page.tsx` | Textos `BarbershopSetting` (só proprietário) |
| `/admin/login` | `src/app/admin/(auth)/login/page.tsx` | Formulário de login |
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
| Serviços admin (lista + criar) | `src/app/api/admin/services/route.ts` — `GET`, `POST` |
| Serviço (editar + excluir) | `src/app/api/admin/services/[id]/route.ts` — `PATCH`, `DELETE` |
| Agendamento (atribuir profissional) | `src/app/api/admin/appointments/[id]/route.ts` — `PATCH`, só OWNER/ADMIN |
| Configuração | `src/app/api/admin/settings/route.ts` |
| Login / logout painel | `src/app/api/auth/login/route.ts`, `logout/route.ts` |
| Perfil (dados + senha) | `src/app/api/auth/profile/route.ts` — `PATCH` (próprio usuário) |
| Expediente (funcionário) | `src/app/api/auth/work-schedule/route.ts` — `GET`, `PATCH` (só **STAFF**) |
| Foto de perfil | `src/app/api/auth/profile/avatar/route.ts` — `POST` (multipart `file`), `DELETE` — Cloudinary |
| Web Push (VAPID + subscrição) | `src/app/api/auth/push/config/route.ts` — `GET` (chave pública); `subscribe/route.ts` — `POST` (guardar subscrição), `DELETE` (remover por `endpoint`) — sessão staff |

## Biblioteca (`src/lib`)

| Arquivo | Responsabilidade |
|---------|------------------|
| `prisma.ts` | Cliente Prisma (adapter pg quando aplicável) |
| `types.ts` | Tipos compartilhados + schema Zod de criação de agendamento |
| `utils.ts` | `cn`, dinheiro, datas, cálculo de slots |
| `constants.ts` | `BARBER_SHOP_ADDRESS`, `BARBER_CONTACT_LINKS` (tel, WhatsApp, Instagram) |
| `contact-links.ts` | `getWhatsappContactHref`, `getInstagramContactHref` a partir das constantes |
| `lordicon-cdn-ids.ts` | IDs públicos `cdn.lordicon.com` por slot; `lordicon-server.ts` usa sem API token |
| `data.ts` | `getServices`, `getPublicBarbers`, `getBarbersForBooking` (STAFF da unidade padrão), seed assistido se necessário |
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
| `cloudinary-server.ts` | Upload/remoção de avatar no Cloudinary (só servidor; requer `CLOUDINARY_*`) |
| `appointment-slot-conflict.ts` | Regras de sobreposição de horário (agendamento geral vs. por profissional); `excludeAppointmentId` na remarcação |
| `public-booking-slot.ts` | Validação compartilhada de slot (expediente, profissional, conflitos) — `POST /api/appointments` e gestão pública |
| `client-manage-token.ts` | Formato UUID do token de gestão da reserva (`/minha-reserva/...`) |
| `notify-barber-booking.ts` | Envio de e-mail via Resend ao barbeiro atribuído (`RESEND_*`) |
| `work-week.ts` | Expediente semanal do barbeiro (`workWeekJson`), interseção com horário da loja |

## Componentes UI relevantes

| Componente | Pasta |
|------------|-------|
| Navbar (ícones redes, link Painel) | `src/components/navbar.tsx`, `navbar-client.tsx` |
| Hero, seções animadas | `hero.tsx`, `hero-studio-panel.tsx` (painel 3D / spotlight), `animated-section.tsx`, `section-title.tsx`, `home-barbers-grid.tsx` (cartões da equipe na home) |
| Formulário agendamento | `booking-form.tsx` |
| Gestão reserva (cliente) | `manage-reservation-client.tsx` |
| Painel | `admin-panel-nav.tsx`, `admin-table.tsx`, `admin-appointment-filters-form.tsx`, `admin-pagination.tsx`, `admin-export-button.tsx`, `dashboard-period-tabs.tsx`, `dashboard-telemetry-scope-tabs.tsx`, `dashboard-unit-telemetry.tsx`, `dashboard-volume-area.tsx`, `dashboard-revenue-line.tsx`, `dashboard-payment-stack.tsx`, `dashboard-status-pie.tsx`, `dashboard-services-bar-chart.tsx`, `dashboard-summary-table.tsx`, `admin-units-manager.tsx`, `admin-staff-manager.tsx`, `admin-services-manager.tsx`, `admin-settings-manager.tsx`, `admin-profile-form.tsx`, `admin-work-schedule-form.tsx` |
| Mapa (contato) | `location-map.tsx` |
| Aviso BD offline | `database-unavailable-notice.tsx` |
| Logo marca | `brand-logo.tsx` + [`public/images/logo.jpeg`](../public/images/logo.jpeg) (favicon + UI; também notificações push em `public/sw.js`) |
| Ícones de marca (WhatsApp / Instagram) | `src/components/icons/whatsapp-icon.tsx`, `instagram-icon.tsx`, `index.ts` |

## Prisma

| Arquivo | Função |
|---------|--------|
| `prisma/schema.prisma` | `Service`, `Appointment`, `BarbershopUnit`, `StaffMember`, `Session`, `BarbershopSetting`, enums |
| `prisma/seed.ts` | Serviços + unidade matriz + proprietário inicial + `unitId` em agendamentos sem unidade |
| `prisma.config.ts` | Configuração Prisma 7 (se presente) |

## Autenticação e proxy

| Arquivo | Função |
|---------|--------|
| `src/proxy.ts` | Next.js 16 **proxy** (ex-middleware): `NextResponse.next()` — auth do painel é por sessão no servidor |
| `src/app/layout.tsx` | Layout raiz, fontes (Geist + display), sem provider de terceiros para auth |

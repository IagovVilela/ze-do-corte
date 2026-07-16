# Arquitetura — Zé do Corte

## Visão geral

Monólito **Next.js 16** (App Router) com UI em React 19, estilos com **Tailwind CSS 4**, animações com **Framer Motion**. Persistência em **PostgreSQL** via **Prisma 7**. O painel administrativo usa **e-mail, senha (bcrypt) e sessão** (`Session` + cookie HTTP-only); clientes que agendam **não** precisam de conta.

## Camadas

1. **Apresentação** — `src/app/**/page.tsx`, componentes em `src/components/*`.
2. **API Routes** — `src/app/api/**/route.ts` (REST JSON ou binário no export Excel).
3. **Domínio / dados** — `src/lib/*` (validação Zod, helpers de slots, dashboard admin, auth admin).
4. **Banco de dados** — `prisma/schema.prisma`, acesso via `src/lib/prisma.ts`.

## Fluxo público (institucional + agendamento)

- **`/`** — Landing da **plataforma Barbernegon** (venda B2B; não é o site de um tenant). Com split de hosts, só no **marketing host**.
- **`/explorar`** — Marketplace: busca por serviço/cidade/categoria (`searchMarketplaceShops` / `GET /api/marketplace/shops`). Card → **site** `/{slug}` (principal) ou atalho **Agendar**; favoritos no aparelho (`/explorar/favoritos`); mapa embutido; média de avaliações. Avaliar via `POST /api/marketplace/reviews` com token da reserva. Orgs com `marketplaceListed` e plano `TRIAL`/`ACTIVE`. Com split, vive no **marketplace host** (`/` nesse host reescreve para `/explorar`).
- **Domínios** — `NEXT_PUBLIC_MARKETING_HOST` + `NEXT_PUBLIC_MARKETPLACE_HOST` (mesmo deploy). Gate em `src/proxy.ts` + `src/lib/public-hosts.ts`: consumidor não vê landing/cadastro/planos; marketing redireciona `/explorar*` para o host consumer. Sem as duas envs, paths compartilhados (dev).
- **`/[slug]`** — Site institucional do tenant. `Organization.siteJson` **v2 (canvas)** renderizado por `TenantCanvasRenderer`. Fallbacks de branding neutros. Constantes `BARBER_*` **não** alimentam essa rota.
- **`/[slug]/agendar`** — Formulário cliente (`BookingForm`) scoped à org:
  - `GET /api/appointments/available` — slots livres por serviço e data; com **`staffMemberId`**, considera só conflitos desse profissional (e vagas ainda sem profissional);
  - `POST /api/appointments` — cria via `booking-domain` (`createPublicBooking`); aviso ao profissional (Web Push / Resend); se WhatsApp do tenant ativo, confirmação ao cliente (`whatsapp-notify-client`).
- **WhatsApp (Meta Cloud API)** — webhook `GET|POST /api/webhooks/whatsapp`; bot FSM (`whatsapp-bot-fsm`) agenda/remarca/cancela; admin `/admin/whatsapp`. Detalhes: [whatsapp-meta.md](./whatsapp-meta.md).
- **`/agendar`** — legado mono-marca: redireciona para o tenant seed (`/ze-do-corte/agendar`).
- **`/minha-reserva/[token]`** — Cliente consulta, **remarca** ou **cancela** (`CONFIRMED` e horário futuro) sem conta; **`GET`/`PATCH /api/appointments/manage/[token]`**. O token é equivalente a uma senha — não partilhar em canais públicos.

### Site editável (`Organization.siteJson`)

- **v2 (canvas)**: arteboards `desktop` / `mobile` + `elements[]` com `frame {x,y,w,h}` absolutos. Contrato em `src/lib/site-canvas.ts`. Editor visual em **`/admin/site`**. Render público: `TenantCanvasRenderer`.
- Tipos de biblioteca: básicos (texto, botão, badge, divisor, espaço), layout (hero, painel, grid, retângulo), mídia, e blocos de negócio (menu, serviços, equipe, contato, rodapé).
- Presets: estilos de botão/badge/painel/texto/hero/retângulo (faixas), seções pré-montadas (incl. faixa de cor e Manhã/Tarde/Noite) e tipografia — `src/lib/canvas-presets.ts`. Biblioteca do editor: abas Itens / Seções / Prontos. Espaço (`spacer`) só mostra listras no editor.
- **Modelos de página** (layouts completos desktop+mobile, estruturas distintas): blank; classic (centro + painéis); studio (70/30 foto); minimal (coluna 640); moderno (split 50/50); editorial (spine magazine); impacto (hero full); noir (sidebar); neon (barras + ticker); brutalista (grade bordada); ocean (faixas maré); boutique (ritual centrado); bauhaus (formas ■●■); rua (contato primeiro) — `src/lib/canvas-page-templates.ts`.
- Tema do canvas (`theme.primary|secondary|background|surface|text` + `fontDisplay`/`fontBody`) → CSS vars via `canvasThemeStyle` / `organizationBrandStyle`.
- **v1 (legado)**: `sections[]` ordenadas — convertido automaticamente para v2 no parse (`migrateSitePageToCanvas`).
- Cadastro e templates gravam **v2**. Identidade (logo, slug, redes) permanece em **`/admin/marca`**.

CSS vars da paleta: `organizationBrandStyle` / `resolveSiteCanvas` em `src/lib/org-branding.ts` (+ `src/lib/canvas-theme-style.ts` no cliente).

## Fluxo administrativo

- **`/admin/login`** — `POST /api/auth/login` valida `StaffMember.passwordHash`, cria linha em `Session` e define cookie. O primeiro **OWNER** com senha pode ser criado no deploy com `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` (`npm run start:prod` → `ensure-owner.ts`; em produção há reforço em `src/instrumentation.ts`). Query `?from=/caminho` redireciona após login.
- **`/plataforma`** — console **Barbernegon Ops** isolado: entrada secreta `/plataforma/login?k=PLATFORM_OPS_GATE` (404 sem chave); e-mails em `PLATFORM_ADMIN_EMAILS` / `SEED_OWNER_EMAIL`; sidebar com visão geral, barbearias, marketplace e consumidores. Sem sessão → 404 (não revela login). APIs em `/api/plataforma/*`.
- **`/admin/marca`** — identidade (nome, slug, logo, cores, slogans, redes, uploads, opt-in marketplace).
- **`/admin/site`** — canvas tipo Canva: biblioteca (hero/painel/grid etc.), cores do sistema, arteboards desktop/mobile, drag/resize, inspector com **upload do dispositivo** (imagem/vídeo), templates, salvar `siteJson` v2. No celular: tela cheia + dock (Biblioteca / Editar / Mais) em vez das 3 colunas.
- **`/admin/whatsapp`** — conecta Phone number ID + token Meta (cifrado), liga/desliga bot, logs de envio.
- **`/admin/perfil`** — utilizador autenticado altera `displayName`, `phone`, senha (`PATCH /api/auth/profile`) e foto (`POST`/`DELETE /api/auth/profile/avatar` → Cloudinary quando configurado); a foto alimenta o cartão na home para quem é barbeiro em destaque. Opcionalmente ativa **Web Push** (VAPID + `public/sw.js`) para receber aviso de agendamento atribuído sem e-mail.
- **`/admin/expediente`** — só **STAFF**: define o próprio `workWeekJson` via `PATCH /api/auth/work-schedule`; `null` segue só o horário global da barbearia nos slots públicos.
- **`/admin/equipe`** — gestão de membros; para **STAFF**, texto e visibilidade na home (`PATCH /api/admin/staff/[id]`) e **expediente** por funcionário para **OWNER/ADMIN** (`GET`/`PATCH /api/admin/staff/[id]/work-schedule`).
- **`/admin` (painel)** — Gráficos temporais agrupam por **calendário em `America/Sao_Paulo`** (`BARBER_TIMEZONE`), não pelo fuso do servidor. `getAdminDashboardSnapshot` (mesmos filtros de URL que a lista: `status`, `staff`, `unit`, `q`) + gráficos + **Resumo operacional** com formulário de filtros; **OWNER/ADMIN** têm **telemetria por unidade** abaixo das abas de período, com janela **Hoje e semana** ou **Período dos gráficos** (`?telemetryScope=chart`), agregada por `unitId`; com filtro de unidade na URL, só essa unidade aparece. Tabela de agendamentos: atribuir barbeiro, **remarcar** data/hora, concluir/cancelar, pagamento — cancelar/remarcar avisam o cliente (WhatsApp + e-mail). `src/app/admin/(panel)/layout.tsx`: `getStaffAccessOrNull()`; sem sessão → `redirect("/admin/login")`.
- **`src/proxy.ts`** — Next.js 16 **proxy**: legado `/agendar`; com hosts B2B/consumer configurados, rewrite/redirect por `Host` (`public-hosts.ts`). Auth do painel é sessão no servidor.
- **APIs `/api/admin/*`** — `requireStaffApiAuth()` e permissões por papel (export, unidades, equipe, serviços, configuração, **PATCH** em agendamentos para `staffMemberId` só OWNER/ADMIN).

### Papéis

Documentação detalhada: **[admin-hierarquia.md](./admin-hierarquia.md)**.

- **`StaffMember`** — e-mail, `StaffRole`, `passwordHash`, `unitId` obrigatório para **STAFF**.
- Não há mais `OWNER_EMAILS` / `ADMIN_EMAILS` nem Clerk: só utilizadores com registo e senha no banco.

## Modelo de dados (resumo)

Ver `prisma/schema.prisma` para o contrato exato.

- **Organization** — tenant: `slug`, branding (`logoUrl`, `primaryColor`, slogans, redes, `heroMediaUrl`, …), **`siteJson`** (página institucional), `timezone`, `planStatus` / `planTier` / trial, billing Asaas (plataforma + API key do salão).
- **PaymentEvent** — eventos Asaas processados (idempotência do webhook).
- **Service** — obrigatoriamente ligado a uma **`BarbershopUnit`** (`unitId`); unicidade do nome **por unidade** (preços/catálogo podem variar entre lojas); **`category`** (`ServiceCategory`), duração, preço, `isActive`.
- **Appointment** — cliente, dados de contato, intervalo `startsAt`/`endsAt`, `status` (enum), relação com `Service`, opcionalmente **`unitId`**, opcionalmente **`staffMemberId`** (barbeiro `STAFF` atribuído; reservas públicas costumam entrar sem profissional até dono/admin atribuírem), **`clientManageToken`** opcional (link secreto `/minha-reserva/...` gerado na reserva pública), pagamento (`paidAt`, `paymentMethod`, `paymentStatus`, `asaasPaymentId`, crédito de clube).
- **BarbershopUnit** — unidades (slug, endereço, `isDefault` para o site público).
- **StaffMember** — e-mail, `StaffRole`, hash bcrypt da senha, unidade opcional (obrigatória para STAFF), `displayName`, `phone`, `profileImageUrl` / `profileImagePublicId` (Cloudinary), `websiteBio` e `showOnWebsite` (cartão na página inicial, só para STAFF), `workWeekJson` opcional (expediente semanal do barbeiro), subscrições **Web Push** (`StaffPushSubscription`: `endpoint`, chaves `p256dh` / `auth`).
- **Session** — `tokenHash` (SHA-256 do token do cookie), `expiresAt`, ligação a `StaffMember`.
- **BarbershopSetting** — pares chave/valor (textos institucionais editáveis no painel).

## Exportação e métricas

- **`src/lib/admin-dashboard.ts`** — fonte única para série dos últimos 7 dias, contagens e próximo agendamento `CONFIRMED`.
- **`GET /api/admin/dashboard`** — JSON (protegido): métricas, série de 7 dias, fatias de status no mês, top serviços no mês, linhas de resumo e próximo agendamento; a página `/admin` usa as mesmas funções no servidor.
- **`GET /api/admin/export`** — arquivo XLSX (protegido).

## Diagrama lógico (texto)

```
Cliente → /[slug] (siteJson) + /[slug]/agendar → API appointments → Prisma → PostgreSQL
Dono → /admin/marca → Organization.siteJson / branding → TenantSiteRenderer
Admin → /admin/login → Session + cookie → /admin + APIs admin → Prisma → PostgreSQL
```

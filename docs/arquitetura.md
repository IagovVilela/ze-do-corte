# Arquitetura — Zé do Corte

## Visão geral

Monólito **Next.js 16** (App Router) com UI em React 19, estilos com **Tailwind CSS 4**, animações com **Framer Motion**. Persistência em **PostgreSQL** via **Prisma 7**. O painel administrativo usa **e-mail, senha (bcrypt) e sessão** (`Session` + cookie HTTP-only); clientes que agendam **não** precisam de conta.

## Camadas

1. **Apresentação** — `src/app/**/page.tsx`, componentes em `src/components/*`.
2. **API Routes** — `src/app/api/**/route.ts` (REST JSON ou binário no export Excel).
3. **Domínio / dados** — `src/lib/*` (validação Zod, helpers de slots, dashboard admin, auth admin).
4. **Banco de dados** — `prisma/schema.prisma`, acesso via `src/lib/prisma.ts`.

## Fluxo público (institucional + agendamento)

- **`/`** — Server Component obtém serviços (`getServices` / Prisma) e barbeiros públicos (`getPublicBarbers`: `STAFF` com `showOnWebsite`); renderiza Hero, lista de serviços, secção **Equipe** (se houver), contato, mapa.
- **`/agendar`** — Formulário cliente (`BookingForm`) chama:
  - `GET /api/appointments/available` — slots livres por serviço e data; com **`staffMemberId`**, considera só conflitos desse profissional (e vagas ainda sem profissional);
  - `POST /api/appointments` — cria registro; valida sobreposição; opcionalmente **`staffMemberId`** (barbeiro da unidade padrão); define **`clientManageToken`** (UUID) para o link de gestão. Com **Resend** (`RESEND_API_KEY` + `RESEND_FROM_EMAIL`), envia e-mail ao barbeiro quando atribuído.
- **`/minha-reserva/[token]`** — Cliente consulta, **remarca** ou **cancela** (`CONFIRMED` e horário futuro) sem conta; **`GET`/`PATCH /api/appointments/manage/[token]`**. O token é equivalente a uma senha — não partilhar em canais públicos.

## Fluxo administrativo

- **`/admin/login`** — `POST /api/auth/login` valida `StaffMember.passwordHash`, cria linha em `Session` e define cookie.
- **`/admin/perfil`** — utilizador autenticado altera `displayName`, `phone`, senha (`PATCH /api/auth/profile`) e foto (`POST`/`DELETE /api/auth/profile/avatar` → Cloudinary quando configurado); a foto alimenta o cartão na home para quem é barbeiro em destaque.
- **`/admin/expediente`** — só **STAFF**: define o próprio `workWeekJson` via `PATCH /api/auth/work-schedule`; `null` segue só o horário global da barbearia nos slots públicos.
- **`/admin/equipe`** — gestão de membros; para **STAFF**, texto e visibilidade na home (`PATCH /api/admin/staff/[id]`) e **expediente** por funcionário para **OWNER/ADMIN** (`GET`/`PATCH /api/admin/staff/[id]/work-schedule`).
- **`/admin` (painel)** — `src/app/admin/(panel)/layout.tsx`: `getStaffAccessOrNull()` (`src/lib/admin-auth.ts` + `src/lib/staff-access.ts`); sem sessão válida → `redirect("/admin/login")`.
- **`src/proxy.ts`** — pass-through mínimo (Next.js 16 **proxy**); não faz auth Clerk.
- **APIs `/api/admin/*`** — `requireStaffApiAuth()` e permissões por papel (export, unidades, equipe, serviços, configuração, **PATCH** em agendamentos para `staffMemberId` só OWNER/ADMIN).

### Papéis

Documentação detalhada: **[admin-hierarquia.md](./admin-hierarquia.md)**.

- **`StaffMember`** — e-mail, `StaffRole`, `passwordHash`, `unitId` obrigatório para **STAFF**.
- Não há mais `OWNER_EMAILS` / `ADMIN_EMAILS` nem Clerk: só utilizadores com registo e senha no banco.

## Modelo de dados (resumo)

Ver `prisma/schema.prisma` para o contrato exato.

- **Service** — nome, descrição, **`category`** (`ServiceCategory`: Corte, Barba, Combo, Tratamento, Outro), duração, preço, `isActive`.
- **Appointment** — cliente, dados de contato, intervalo `startsAt`/`endsAt`, `status` (enum), relação com `Service`, opcionalmente **`unitId`**, opcionalmente **`staffMemberId`** (barbeiro `STAFF` atribuído; reservas públicas costumam entrar sem profissional até dono/admin atribuírem), **`clientManageToken`** opcional (link secreto `/minha-reserva/...` gerado na reserva pública), pagamento em balcão (`paidAt`, `paymentMethod`).
- **BarbershopUnit** — unidades (slug, endereço, `isDefault` para o site público).
- **StaffMember** — e-mail, `StaffRole`, hash bcrypt da senha, unidade opcional (obrigatória para STAFF), `displayName`, `phone`, `profileImageUrl` / `profileImagePublicId` (Cloudinary), `websiteBio` e `showOnWebsite` (cartão na página inicial, só para STAFF), `workWeekJson` opcional (expediente semanal do barbeiro).
- **Session** — `tokenHash` (SHA-256 do token do cookie), `expiresAt`, ligação a `StaffMember`.
- **BarbershopSetting** — pares chave/valor (textos institucionais editáveis no painel).

## Exportação e métricas

- **`src/lib/admin-dashboard.ts`** — fonte única para série dos últimos 7 dias, contagens e próximo agendamento `CONFIRMED`.
- **`GET /api/admin/dashboard`** — JSON (protegido): métricas, série de 7 dias, fatias de status no mês, top serviços no mês, linhas de resumo e próximo agendamento; a página `/admin` usa as mesmas funções no servidor.
- **`GET /api/admin/export`** — arquivo XLSX (protegido).

## Diagrama lógico (texto)

```
Cliente → páginas / e /agendar → API appointments → Prisma → PostgreSQL
Admin → /admin/login → Session + cookie → /admin + APIs admin → Prisma → PostgreSQL
```

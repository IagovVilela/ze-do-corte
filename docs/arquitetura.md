# Arquitetura — Zé do Corte

## Visão geral

Monólito **Next.js 16** (App Router) com UI em React 19, estilos com **Tailwind CSS 4**, animações com **Framer Motion**. Persistência em **PostgreSQL** via **Prisma 7**. O painel administrativo usa **Clerk** para identidade; clientes que agendam **não** precisam de conta.

## Camadas

1. **Apresentação** — `src/app/**/page.tsx`, componentes em `src/components/*`.
2. **API Routes** — `src/app/api/**/route.ts` (REST JSON ou binário no export Excel).
3. **Domínio / dados** — `src/lib/*` (validação Zod, helpers de slots, dashboard admin, auth admin).
4. **Base de dados** — `prisma/schema.prisma`, acesso via `src/lib/prisma.ts`.

## Fluxo público (institucional + agendamento)

- **`/`** — Server Component obtém serviços (`getServices` / Prisma), renderiza Hero, lista de serviços, contacto, mapa.
- **`/agendar`** — Formulário cliente (`BookingForm`) chama:
  - `GET /api/appointments/available` — slots livres por serviço e data;
  - `POST /api/appointments` — cria registo; o servidor valida sobreposição com agendamentos `CONFIRMED` ou `COMPLETED`.

## Fluxo administrativo

- **`/admin`** — Protegido por:
  1. **`src/middleware.ts`** — `clerkMiddleware` + `auth.protect()` para rotas `/admin`.
  2. **`src/app/admin/layout.tsx`** — `currentUser()` + `ADMIN_EMAILS` (`src/lib/admin-auth.ts`); se o e-mail não for permitido, `redirect("/")`.
- **APIs `/api/admin/*`** — `requireAdminApiAuth()` nas rotas: sessão Clerk + mesma regra de e-mails.

### Regra `ADMIN_EMAILS`

- Lista separada por vírgulas, comparação case-insensitive.
- **Desenvolvimento** + lista vazia: qualquer utilizador autenticado é tratado como admin (facilita testes).
- **Produção** + lista vazia: nenhum e-mail passa na verificação → sem acesso admin.

## Modelo de dados (resumo)

Ver `prisma/schema.prisma` para o contrato exato.

- **Service** — nome, descrição, duração, preço, `isActive`.
- **Appointment** — cliente, contacto, intervalo `startsAt`/`endsAt`, `status` (enum), relação com `Service`.

## Exportação e métricas

- **`src/lib/admin-dashboard.ts`** — fonte única para série dos últimos 7 dias, contagens e próximo agendamento `CONFIRMED`.
- **`GET /api/admin/dashboard`** — JSON (protegido); a página admin usa as mesmas funções no servidor.
- **`GET /api/admin/export`** — ficheiro XLSX (protegido).

## Middleware e Next.js 16

O ficheiro `src/middleware.ts` pode emitir aviso de depreciação em favor de **proxy** no Next 16; o comportamento atual continua válido até migração oficial.

## Diagrama lógico (texto)

```
Cliente → páginas / e /agendar → API appointments → Prisma → PostgreSQL
Admin → /admin (Clerk + ADMIN_EMAILS) → Prisma / APIs admin → PostgreSQL
```

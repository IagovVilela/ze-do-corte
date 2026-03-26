# Módulos e ficheiros-chave

Mapa orientativo — quando alterar uma área, atualize também [historico-de-mudancas.md](./historico-de-mudancas.md) se o comportamento visível ou de API mudar.

## Raiz do repositório

| Caminho | Função |
|---------|--------|
| `package.json` | Scripts `dev`, `build`, `db:*`, dependências |
| `.env.example` | Modelo de variáveis (nunca commitar segredos reais) |
| `INICIAR_ZE_DO_CORTE.bat` | Arranque assistido no Windows (Node, Prisma, `npm run dev`) |
| `PREPARAR_BASE.bat` | Docker Postgres + `.env` + `prisma db push` + seed |
| `docker-compose.yml` | Serviço `postgres:16` para desenvolvimento local |
| `scripts/preparar-postgres.ps1` | Script chamado pelo `PREPARAR_BASE.bat` |
| `INICIAR_APLICACAO.bat` | Legado: outro projeto Laravel em `reviews-platform` (não é este app) |

## App Router — páginas

| Rota | Ficheiro | Notas |
|------|----------|--------|
| `/` | `src/app/page.tsx` | Institucional, serviços do DB |
| `/agendar` | `src/app/agendar/page.tsx` | Agendamento |
| `/admin` | `src/app/admin/page.tsx` | Painel + paginação `?page=` |
| `/admin` layout | `src/app/admin/layout.tsx` | Gate `ADMIN_EMAILS` |
| `/sign-in` | `src/app/sign-in/[[...sign-in]]/page.tsx` | Clerk `SignIn` |

## API Routes

| Caminho | Ficheiro |
|---------|----------|
| Serviços | `src/app/api/services/route.ts` |
| Slots disponíveis | `src/app/api/appointments/available/route.ts` |
| Criar agendamento | `src/app/api/appointments/route.ts` |
| Dashboard JSON | `src/app/api/admin/dashboard/route.ts` |
| Export Excel | `src/app/api/admin/export/route.ts` |

## Biblioteca (`src/lib`)

| Ficheiro | Responsabilidade |
|----------|------------------|
| `prisma.ts` | Cliente Prisma (adapter pg quando aplicável) |
| `types.ts` | Tipos partilhados + schema Zod de criação de agendamento |
| `utils.ts` | `cn`, dinheiro, datas, cálculo de slots |
| `constants.ts` | `BARBER_SHOP_ADDRESS`, horário de negócio para UI de slots |
| `data.ts` | `getServices`, seed assistido se necessário |
| `clerk-config.ts` | `isClerkConfigured()` — chave `pk_...` presente |
| `admin-auth.ts` | `ADMIN_EMAILS`, `requireAdminApiAuth`, e-mail primário Clerk |
| `admin-dashboard.ts` | Métricas admin + lista paginada |

## Componentes UI relevantes

| Componente | Pasta |
|------------|--------|
| Navbar (Clerk `useAuth`) | `src/components/navbar.tsx` |
| Hero, secções animadas | `hero.tsx`, `hero-studio-panel.tsx` (painel 3D / spotlight), `animated-section.tsx`, `section-title.tsx` |
| Formulário agendamento | `booking-form.tsx` |
| Painel | `admin-table.tsx`, `admin-pagination.tsx`, `admin-export-button.tsx`, `dashboard-chart.tsx` |
| Mapa contacto | `location-map.tsx` |
| Aviso BD offline | `database-unavailable-notice.tsx` |
| Logo marca | `brand-logo.tsx` + ficheiro estático [`public/images/logo.jpeg`](../public/images/logo.jpeg) |

## Prisma

| Ficheiro | Função |
|----------|--------|
| `prisma/schema.prisma` | Modelos `Service`, `Appointment` |
| `prisma/seed.ts` | Dados iniciais de serviços |
| `prisma.config.ts` | Configuração Prisma 7 (se presente) |

## Autenticação e proxy

| Ficheiro | Função |
|----------|--------|
| `src/middleware.ts` | Clerk: protege `/admin` |
| `src/app/layout.tsx` | `ClerkProvider`, fontes (Geist + display) |

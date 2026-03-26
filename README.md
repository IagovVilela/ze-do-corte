# Zé do Corte — Sistema Web de Barbearia

## Documentação detalhada

Referências em Markdown (arquitetura, mapa de ficheiros, operação, histórico de mudanças e como manter os docs): **[`docs/README.md`](./docs/README.md)**.

---

Sistema completo para barbearia com:

- Site institucional premium (home, serviços, contato, mapa)
- Agendamento online com bloqueio automático de horários
- Painel administrativo protegido (Clerk), métricas, gráfico dos últimos 7 dias, paginação e exportação Excel

## Tecnologias

- Next.js (App Router) + React + TypeScript
- Tailwind CSS + Framer Motion
- Clerk (autenticação do painel)
- Prisma ORM + PostgreSQL
- Recharts (dashboard) + XLSX (exportação)

## Requisitos

- Node.js 20+
- PostgreSQL **ou** [Docker Desktop](https://www.docker.com/products/docker-desktop/) para subir Postgres local via `PREPARAR_BASE.bat`
- Conta [Clerk](https://clerk.com) (chaves de API)

## Configuração rápida

1. Instale as dependências:

```bash
npm install
```

2. Base de dados **local com Docker** (recomendado no Windows): na raiz do projeto, execute **`PREPARAR_BASE.bat`** (ou `powershell -ExecutionPolicy Bypass -File scripts/preparar-postgres.ps1`). Isto sobe PostgreSQL em Docker, cria a base `ze_do_corte`, preenche `DATABASE_URL` no `.env` e corre `prisma db push` + seed. Requer [Docker Desktop](https://www.docker.com/products/docker-desktop/) a correr.

3. Variáveis de ambiente (se ainda não tiver `.env`):

```bash
cp .env.example .env
```

Se não usou o `PREPARAR_BASE.bat`, preencha no `.env`:

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | String de conexão PostgreSQL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Chave pública Clerk |
| `CLERK_SECRET_KEY` | Chave secreta Clerk |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-in` (ou `/sign-up` se criar fluxo de cadastro) |
| `ADMIN_EMAILS` | E-mails autorizados no painel, separados por vírgula |
| `LORDICON_API_TOKEN` | (Opcional) Token Bearer da [API Lordicon](https://lordicon.com/docs/api/documentation) — só no servidor; ícones animados na home usam `/api/lordicon/icon`. Sem token, o site usa ícones estáticos (fallback). **Nunca** uses prefixo `NEXT_PUBLIC_` nem commits este valor. |

**Clerk:** sem `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` e `CLERK_SECRET_KEY` válidas (`pk_` / `sk_`), em **desenvolvimento** o site e o `/admin` funcionam mesmo assim (modo local; ver `src/lib/clerk-config.ts`). Para login real e produção, crie uma app no [Clerk](https://clerk.com) e preencha as chaves.

**Admin:** com Clerk ativo, em **desenvolvimento** e `ADMIN_EMAILS` vazio, qualquer utilizador autenticado acessa o admin. Em **produção**, lista vazia bloqueia — defina ao menos um e-mail.

4. Gere o client Prisma e sincronize o schema (ignore se o passo Docker já correu):

```bash
npx prisma generate
npm run db:push
```

5. (Opcional) Dados iniciais de serviços (ignore se o seed já correu no preparar):

```bash
npm run db:seed
```

6. Subir o app:

```bash
npm run dev
```

Abra `http://localhost:3000`.

## Deploy (Vercel + Postgres)

1. Crie um projeto no [Vercel](https://vercel.com) apontando para este repositório.
2. Provisione PostgreSQL (ex.: [Neon](https://neon.tech), [Vercel Postgres](https://vercel.com/storage/postgres), Railway) e defina `DATABASE_URL` nas Environment Variables do projeto.
3. Adicione a integração **Clerk** no Vercel (Marketplace) ou copie manualmente `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` e `CLERK_SECRET_KEY`.
4. Configure `ADMIN_EMAILS` com o e-mail do dono (mesmo usado no login Clerk).
5. No painel Clerk, defina URLs permitidas: domínio de produção e `http://localhost:3000` para desenvolvimento.
6. Após o deploy, rode migrações no ambiente de CI ou localmente apontando ao banco de produção: `npx prisma migrate deploy` (se usar migrations) ou `prisma db push` conforme seu fluxo.

## Rotas principais

- `/` — Institucional
- `/agendar` — Agendamento
- `/sign-in` — Login (Clerk)
- `/admin` — Painel (requer login + e-mail em `ADMIN_EMAILS` em produção)

## APIs

- `GET /api/services`
- `GET /api/appointments/available?serviceId=...&date=YYYY-MM-DD`
- `POST /api/appointments`
- `GET /api/admin/dashboard` — protegida (Clerk + `ADMIN_EMAILS`)
- `GET /api/admin/export` — protegida; download XLSX

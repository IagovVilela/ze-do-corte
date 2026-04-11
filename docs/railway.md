# Deploy na Railway

Guia para publicar **Zé do Corte** (Next.js + PostgreSQL + Prisma) na [Railway](https://railway.com/).

## Pré-requisitos

- Conta na Railway e repositório Git (GitHub/GitLab) ligado ao projeto.
- **Node.js** compatível com Prisma 7 (`^20.19`, `^22.12` ou `>=24`); `nixpacks.toml` usa **Node 24** porque os majors `20`/`22` no Nixpacks costumam resolver para versões **abaixo** do mínimo (ex.: 20.18, 22.11) e o `postinstall` do Prisma falha.

## 1. Base de dados PostgreSQL

1. No projeto Railway, **Add** → **Database** → **PostgreSQL**.
2. Na variável de serviço da **aplicação** (Next), adicione referência à URL do Postgres:
   - **Variables** → **New Variable** → escolha **DATABASE_URL** a partir do plugin Postgres (Railway preenche o valor, muitas vezes já com `?sslmode=require` ou equivalente).
3. Não commite credenciais; use só variáveis no painel.

## 2. Serviço da aplicação

1. **New** → **GitHub Repo** (ou deploy a partir do mesmo repo) e selecione este repositório.
2. O repositório inclui **`Dockerfile`** (Node **24** oficial) e `railway.toml` com **`builder = "DOCKERFILE"`** — evita Railpack/Nixpacks gerados usarem **Node 18** e ignorarem `nixpacks.toml` (Prisma 7 quebra). Opcionalmente existe `nixpacks.toml` para referência local.
   - **Build:** `npm ci` + `npm run build` (o `postinstall` executa `prisma generate`).
   - **Start:** `npm run start:prod` → `prisma migrate deploy` e depois `next start --hostname 0.0.0.0` (a Railway define `PORT`).

## 3. Variáveis de ambiente (aplicação)

| Variável | Obrigatória | Notas |
|----------|-------------|--------|
| `DATABASE_URL` | Sim | Ligada ao Postgres da Railway. |
| `NODE_ENV` | Não | Railway costuma definir `production`. |
| `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` | Para seed | Ver passo 4. |
| `CLOUDINARY_*` | Não | Fotos em `/admin/perfil`. |
| `RESEND_*` | Não | E-mail ao barbeiro. |

Copie o restante a partir de [`.env.example`](../.env.example).

## 4. Primeiro utilizador (OWNER)

As migrações criam as tabelas **vazias**. O painel precisa de um proprietário.

### Automático no deploy (recomendado na Railway)

1. No serviço da **app**, defina **`SEED_OWNER_EMAIL`** e **`SEED_OWNER_PASSWORD`** (mín. 6 caracteres).
2. Em cada arranque, `npm run start:prod` executa `prisma migrate deploy`, depois **`tsx scripts/ensure-owner.ts`**, depois o Next. O script cria o OWNER **uma vez** (idempotente); se o utilizador já existir com senha, não altera.
3. **Reforço:** com `NODE_ENV=production`, o Next executa a mesma lógica em **`src/instrumentation.ts`** ao iniciar o servidor — útil se o **Start Command** tiver sido alterado para só `next start` (sem o script). Mantenha `SEED_OWNER_*` no serviço da app.

Se em produção **não** definir `SEED_OWNER_*`, o deploy continua; verá um aviso nos logs e pode usar o seed manual abaixo ou `DATABASE_PUBLIC_URL` no PC.

### Manual (seed completo ou só dono)

**Opção A — seed (dados de exemplo + unidade + serviços)**

1. Defina `SEED_OWNER_EMAIL` e `SEED_OWNER_PASSWORD` nas variáveis.
2. No terminal local (com [Railway CLI](https://docs.railway.com/guides/cli) ligado ao projeto) **ou** com `DATABASE_PUBLIC_URL` no `.env`:

```bash
railway run npm run db:seed
```

**Opção B — script `create-owner`**

```bash
railway run npm run create-owner
```

(com `CREATE_OWNER_EMAIL` / `CREATE_OWNER_PASSWORD` no ambiente, ou as variáveis `SEED_OWNER_*` como fallback — ver [configurar-admin.md](./configurar-admin.md)).

## 5. Domínio e HTTPS

- Em **Settings** → **Networking** → **Generate Domain** (ou domínio personalizado).
- Cookies de sessão usam `secure` em produção; HTTPS da Railway é adequado.

## 6. Migrações Prisma

- O histórico está em `prisma/migrations/`. Novas alterações ao schema: em desenvolvimento use `npx prisma migrate dev`; em produção o `start:prod` executa `prisma migrate deploy`.
- Se a base **já existia** só com `db push` (sem tabela `_prisma_migrations`), não aplique a migração inicial em cima dela sem um [baseline](https://www.prisma.io/docs/guides/migrate/developing-with-prisma-migrate/baselining) — prefira base nova na Railway para o primeiro deploy.

### Aplicar migrações manualmente na base da Railway (no seu PC)

1. Instale a [Railway CLI](https://docs.railway.com/guides/cli) e faça login: `railway login`.
2. Na pasta do repositório: `railway link` (escolha o projeto e o **serviço da app** que tem `DATABASE_URL` referenciando o Postgres).
3. Execute: **`npm run railway:migrate`** (equivale a `railway run npx prisma migrate deploy` — usa o `DATABASE_URL` do ambiente ligado).

Isto só funciona depois do login e do `link`; não é possível automatizar o login no teu nome a partir do repositório.

## 7. Ficheiros de configuração no repositório

| Ficheiro | Função |
|----------|--------|
| `railway.toml` | Builder **DOCKERFILE** e `startCommand` (`npm run start:prod`). |
| `Dockerfile` | Node **24** (`node:24-bookworm-slim`), build Next + `start:prod`. |
| `nixpacks.toml` | (Opcional) Referência Node 24 se usares Nixpacks fora do Docker. |
| `prisma/migrations/` | Schema inicial + `migration_lock.toml`. |

## 8. Resolução de problemas

- **Build falha no Prisma:** confirme `DATABASE_URL` disponível só se o build precisar de DB (neste projeto o build do Next não deve exigir conexão; se mudar, garanta variável no serviço).
- **502 / app não sobe:** veja **Deployments** → logs; confira se `prisma migrate deploy` concluiu (erros de SQL ou BD inacessível).
- **Login não persiste:** confirme HTTPS, mesmo domínio e que não há bloqueio a cookies de terceiros (first-party na Railway costuma funcionar com `SameSite=Lax`).
- **`Can't reach database server at postgres.railway.internal` (seed ou Prisma no PC):** o host **`*.railway.internal`** só existe **dentro** da rede da Railway. O comando **`railway run`** executa o teu Node **no PC** e só injeta variáveis — **não** coloca o processo dentro da cloud, por isso o URL interno continua inacessível.
  - **Solução:** no serviço **Postgres** → **Networking** / **TCP Proxy** (ou variável pública que o painel mostrar), copie o **URL público** e no `.env` local defina **`DATABASE_PUBLIC_URL`** (ver `.env.example`). O Prisma (`prisma.config.ts`, seed, `create-owner`) usa **`DATABASE_PUBLIC_URL` em preferência a `DATABASE_URL`** para CLI local. Depois: **`npm run db:seed`** ou **`npm run create-owner`**.
  - Na Railway **não** defines `DATABASE_PUBLIC_URL` no serviço da app (só `DATABASE_URL` interno). O script **`ensure-owner`** usa **só `DATABASE_URL`** quando existe (igual a `src/lib/prisma.ts`), para o dono ser criado na **mesma** base onde o login lê. `DATABASE_PUBLIC_URL` no `.env` local continua a servir para `npm run db:seed` no PC.

Para operação geral (scripts, Docker local, etc.), veja [operacao.md](./operacao.md).

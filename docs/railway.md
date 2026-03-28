# Deploy na Railway

Guia para publicar **Zé do Corte** (Next.js + PostgreSQL + Prisma) na [Railway](https://railway.com/).

## Pré-requisitos

- Conta na Railway e repositório Git (GitHub/GitLab) ligado ao projeto.
- **Node.js 20+** (definido em `package.json` → `engines` e `nixpacks.toml`).

## 1. Base de dados PostgreSQL

1. No projeto Railway, **Add** → **Database** → **PostgreSQL**.
2. Na variável de serviço da **aplicação** (Next), adicione referência à URL do Postgres:
   - **Variables** → **New Variable** → escolha **DATABASE_URL** a partir do plugin Postgres (Railway preenche o valor, muitas vezes já com `?sslmode=require` ou equivalente).
3. Não commite credenciais; use só variáveis no painel.

## 2. Serviço da aplicação

1. **New** → **GitHub Repo** (ou deploy a partir do mesmo repo) e selecione este repositório.
2. A Railway deteta **Nixpacks**; o repositório inclui `nixpacks.toml` (Node 20, `npm ci`) e `railway.toml`:
   - **Build:** `npm run build` (o `postinstall` executa `prisma generate`).
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

As migrações criam as tabelas **vazias**. O painel precisa de um proprietário:

**Opção A — seed (recomendado para primeira carga)**

1. Defina `SEED_OWNER_EMAIL` e `SEED_OWNER_PASSWORD` (senha forte, mín. 6 caracteres) nas variáveis do serviço.
2. No terminal local (com [Railway CLI](https://docs.railway.com/guides/cli) ligado ao projeto):

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

## 7. Ficheiros de configuração no repositório

| Ficheiro | Função |
|----------|--------|
| `railway.toml` | Builder Nixpacks e `startCommand` (`npm run start:prod`). |
| `nixpacks.toml` | Node 20 e `npm ci` na fase de instalação. |
| `prisma/migrations/` | Schema inicial + `migration_lock.toml`. |

## 8. Resolução de problemas

- **Build falha no Prisma:** confirme `DATABASE_URL` disponível só se o build precisar de DB (neste projeto o build do Next não deve exigir conexão; se mudar, garanta variável no serviço).
- **502 / app não sobe:** veja **Deployments** → logs; confira se `prisma migrate deploy` concluiu (erros de SQL ou BD inacessível).
- **Login não persiste:** confirme HTTPS, mesmo domínio e que não há bloqueio a cookies de terceiros (first-party na Railway costuma funcionar com `SameSite=Lax`).

Para operação geral (scripts, Docker local, etc.), veja [operacao.md](./operacao.md).

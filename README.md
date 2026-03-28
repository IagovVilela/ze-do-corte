# Zé do Corte — Sistema Web de Barbearia

## Documentação detalhada

Referências em Markdown (arquitetura, mapa de arquivos, operação, histórico de mudanças e como manter os docs): **[`docs/README.md`](./docs/README.md)**.

**Deploy na Railway:** **[`docs/railway.md`](./docs/railway.md)** (`railway.toml`, `nixpacks.toml`, migrações Prisma, seed do proprietário).

---

Sistema completo para barbearia com:

- Site institucional premium (home, serviços, contato, mapa)
- Agendamento online com bloqueio automático de horários
- Painel administrativo com login por e-mail/senha (sessão no PostgreSQL), métricas, gráfico dos últimos 7 dias, paginação, exportação Excel e página **Meu perfil** (dados + foto via Cloudinary, opcional)

## Tecnologias

- Next.js (App Router) + React + TypeScript
- Tailwind CSS + Framer Motion
- Autenticação do painel: bcrypt + cookie HTTP-only + tabelas `StaffMember` / `Session`
- Prisma ORM + PostgreSQL
- Recharts (dashboard) + XLSX (exportação)

## Requisitos

- Node.js 20+
- PostgreSQL **ou** [Docker Desktop](https://www.docker.com/products/docker-desktop/) para subir Postgres local via `PREPARAR_BASE.bat`

## Configuração rápida

1. Instale as dependências:

```bash
npm install
```

2. Banco de dados **local com Docker** (recomendado no Windows): na raiz do projeto, execute **`PREPARAR_BASE.bat`** (ou `powershell -ExecutionPolicy Bypass -File scripts/preparar-postgres.ps1`). Isto sobe PostgreSQL em Docker, cria o banco `ze_do_corte`, preenche `DATABASE_URL` no `.env` e roda `prisma db push` + seed. Requer [Docker Desktop](https://www.docker.com/products/docker-desktop/) em execução.

3. Variáveis de ambiente (se ainda não tiver `.env`):

```bash
cp .env.example .env
```

Se não usou o `PREPARAR_BASE.bat`, preencha no `.env`:

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | String de conexão PostgreSQL |
| `SEED_OWNER_EMAIL` | (Seed) E-mail do primeiro proprietário — padrão `admin@zdc.local` |
| `SEED_OWNER_PASSWORD` | (Seed) Senha inicial (mín. 6 caracteres) para esse proprietário |
| `LORDICON_API_TOKEN` | (Opcional) Token Bearer da [API Lordicon](https://lordicon.com/docs/api/documentation) — só no servidor; com token, `/api/lordicon/icon` escolhe ícones via API. **Sem token**, o mesmo endpoint serve Lottie público a partir do [CDN Lordicon](https://cdn.lordicon.com) (`src/lib/lordicon-cdn-ids.ts`). **Nunca** uses prefixo `NEXT_PUBLIC_` nem commits este valor. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | (Opcional) [Cloudinary](https://cloudinary.com/) — fotos de perfil em **`/admin/perfil`**. Sem estas variáveis, nome/telefone/senha funcionam; upload de foto retorna indisponível. **Não commite** a API Secret. |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | (Opcional) [Resend](https://resend.com/) — e-mail ao barbeiro quando um agendamento fica atribuído a ele (cliente escolhe em **`/agendar`** ou dono/admin atribui no painel), **exceto** se o profissional tiver Web Push ativo (ver abaixo). **Não commite** a API key. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | (Opcional) [Web Push](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) — notificação no browser em **`/admin/perfil`**. Com subscrição ativa, o aviso de novo agendamento **não** usa e-mail. Gere chaves com `npx web-push generate-vapid-keys`. **Não commite** a chave privada. |

**Admin:** após `npm run db:seed`, acesse **`/admin/login`** com `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD`. Novos membros e senhas iniciais em **`/admin/equipe`**. Guia: **`docs/configurar-admin.md`**. Papéis: **`docs/admin-hierarquia.md`**.

4. **Se no `npm run dev` aparecer erro de Turbopack** (`Compaction failed`, `ENOENT` em `.next`): pare o servidor, apague a pasta **`.next`** e tente de novo; em último caso use **`npm run dev:webpack`** (ver [docs/operacao.md](./docs/operacao.md)).

5. Gere o client Prisma e sincronize o schema (ignore se o passo Docker já rodou):

```bash
npx prisma generate
npm run db:push
```

6. (Opcional) Dados iniciais de serviços (ignore se o seed já rodou no preparar):

```bash
npm run db:seed
```

**Ou** um único comando após o `.env` com `DATABASE_URL`: `npm run setup:admin` (generate + push + seed — ver `docs/configurar-admin.md`).

Para **criar ou redefinir só o proprietário** (sem seed completo): `CREATE_OWNER_EMAIL` e `CREATE_OWNER_PASSWORD` no `.env`, depois `npm run create-owner` (detalhes em `docs/configurar-admin.md`).

7. Subir o app:

```bash
npm run dev
```

Abra `http://localhost:3000`.

**Redes (WhatsApp / Instagram):** URLs em `src/lib/constants.ts` → `BARBER_CONTACT_LINKS` (`whatsappHref`, `instagramHref`, ou `whatsappDigits` / `instagramUser` como alternativa). Aparecem na seção Contato da home, na navbar e no rodapé.

## Deploy (Vercel + Postgres)

1. Crie um projeto no [Vercel](https://vercel.com) apontando para este repositório.
2. Provisione PostgreSQL (ex.: [Neon](https://neon.tech), [Vercel Postgres](https://vercel.com/storage/postgres), Railway) e defina `DATABASE_URL` nas Environment Variables do projeto.
3. Após o deploy, aplique o schema ao banco (`prisma migrate deploy` ou `db push`) e execute o seed **uma vez** com `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` **fortes**, ou crie o primeiro `StaffMember` manualmente com `passwordHash` bcrypt.
4. Login do painel: **`/admin/login`** (não há cadastro público automático).

### Deploy na Railway

Guia dedicado: **[`docs/railway.md`](./docs/railway.md)** — Postgres na plataforma, `railway.toml`, `npm run start:prod` e seed com `railway run`.

## Rotas principais

- `/` — Institucional
- `/agendar` — Agendamento
- `/minha-reserva/[token]` — Alterar ou cancelar reserva sem login (link mostrado após confirmar em `/agendar`)
- `/admin/login` — Login do painel (e-mail + senha)
- `/admin` — Painel (sessão + permissões; sub-rotas: unidades, equipe, serviços, configuração). `/sign-in` redireciona para `/admin/login`.

## APIs

- `POST /api/auth/login`, `POST /api/auth/logout` — sessão do painel
- `GET /api/services`
- `GET /api/appointments/available?serviceId=...&date=YYYY-MM-DD`
- `POST /api/appointments`
- `GET|PATCH /api/appointments/manage/[token]` — gestão pública (cancelar / remarcar)
- `GET /api/admin/dashboard` — protegida (papéis do painel)
- `GET /api/admin/export` — protegida; download XLSX (não disponível para funcionário)
- `GET|POST /api/admin/units`, `PATCH|DELETE /api/admin/units/[id]`
- `GET|POST /api/admin/staff`, `PATCH|DELETE /api/admin/staff/[id]`
- `PATCH /api/admin/services/[id]`, `GET|PUT /api/admin/settings`

# Operação — ambiente, scripts e inicialização

## Pré-requisitos

- **Node.js 20+**
- **PostgreSQL** acessível pela `DATABASE_URL` **ou** **Docker Desktop** para desenvolvimento local automático
- Variáveis no `.env`: pelo menos `DATABASE_URL`; para o primeiro utilizador do painel, `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` antes do seed (ver [configurar-admin.md](./configurar-admin.md))

## PostgreSQL local com Docker (recomendado)

1. Instale e inicie o **Docker Desktop**.
2. Na raiz do repositório, execute **`PREPARAR_BASE.bat`** ou:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/preparar-postgres.ps1
```

Isto executa `docker compose up -d` (arquivo [`docker-compose.yml`](../docker-compose.yml)), aguarda o banco ficar pronto, define no `.env`:

`postgresql://postgres:ze_docorte_dev@localhost:5432/ze_do_corte?schema=public`

e roda `prisma generate`, `prisma db push` e `prisma db seed`.

- **Usuário / senha de desenvolvimento:** `postgres` / `ze_docorte_dev` (apenas local).
- **Parar o container:** `docker compose down` (na raiz). **Dados:** volume Docker `ze_do_corte_pgdata`.
- Se a porta **5432** estiver ocupada por outro Postgres, pare esse serviço ou altere o mapeamento de portas no `docker-compose.yml` e a `DATABASE_URL`.

## Variáveis de ambiente

Copiar modelo e editar:

```bash
cp .env.example .env
```

Descrição detalhada das variáveis: [README.md](../README.md) (tabela) e [.env.example](../.env.example).

### Barbernegon Ops (entrada secreta)

| Variável | Função |
|----------|--------|
| `PLATFORM_ADMIN_EMAILS` | E-mails autorizados (além de `SEED_OWNER_EMAIL`) |
| `PLATFORM_OPS_GATE` | Segredo da entrada Ops — sem ele, `/plataforma/login` responde **404** |

URL de entrada (guarde só você): `/plataforma/login?k=SEU_PLATFORM_OPS_GATE`  
No primeiro acesso o sistema grava cookie **httpOnly** `bn_ops_gate` e **remove** o `k` da URL (não fica no histórico).

### Domínios marketing vs marketplace

Opcional. No **mesmo** serviço (ex. Railway), aponte dois domínios customizados HTTPS:

| Variável | Exemplo | Público |
|----------|---------|---------|
| `NEXT_PUBLIC_MARKETING_HOST` | `barbernegon.com` | Landing, cadastro, planos, `/admin`, `/plataforma` |
| `NEXT_PUBLIC_MARKETPLACE_HOST` | `explorar.barbernegon.com` | Marketplace (`/` → explorar), sites `/{slug}`, reservas |

Sem as duas variáveis, a app continua com paths no mesmo host (adequado ao desenvolvimento local). Com ambas, o [`src/proxy.ts`](../src/proxy.ts) redireciona/reescreve para o consumidor **não** ver a página institucional B2B.

### Cloudinary (foto de perfil no painel)

Opcional. Sem `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET`, a página **`/admin/perfil`** continua a permitir nome, telefone e senha; os botões de foto mostram aviso e as APIs de avatar respondem **503**. As imagens ficam na pasta `ze-do-corte/profiles` na conta Cloudinary. **Não commite** a API Secret no repositório.

### Resend (e-mail)

Opcional. Com **`RESEND_API_KEY`** e **`RESEND_FROM_EMAIL`** definidos, o sistema envia e-mail ao endereço do **`StaffMember`** quando:

- o cliente escolhe um profissional em **`/agendar`** e confirma a reserva, ou
- dono/admin atribui um profissional a um agendamento existente no painel (`PATCH /api/admin/appointments/[id]`), ou
- alguém pede **redefinição de senha** em **`/admin/esqueci-senha`** (link válido por 1 hora).

Sem essas variáveis, o agendamento continua normal; no reset de senha o link só aparece no log do servidor (útil em desenvolvimento). O remetente deve ser um domínio **verificado** na [Resend](https://resend.com/) ou, para testes, `onboarding@resend.dev`. Defina também **`NEXT_PUBLIC_APP_URL`** (ou `APP_URL`) para o link do e-mail apontar ao domínio certo. **Não commite** a API key.

**Regra com Web Push:** se o profissional tiver **pelo menos uma** subscrição push ativa na base **e** VAPID estiver configurado (ver abaixo), o sistema **não envia e-mail** para esse aviso — usa só notificação no browser.

### WhatsApp Cloud API (Meta)

Opcional. Configure `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_TOKEN_ENCRYPTION_KEY` (e templates se precisar fora da janela 24h). Webhook: `/api/webhooks/whatsapp`. Cada org liga o número em **`/admin/whatsapp`**. Lembretes: `npm run whatsapp:reminders` (agendar no cron do host). Guia completo: [whatsapp-meta.md](./whatsapp-meta.md).

### Asaas (pagamentos)

Opcional até ativar cobrança. Plataforma: `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `ASAAS_ENV`, `ASAAS_TOKEN_ENCRYPTION_KEY`. Webhook: `/api/webhooks/asaas`. Dono assina em **`/admin/plano`**; o salão conecta a própria key em **`/admin/pagamentos`**. Guia: [pagamentos-asaas.md](./pagamentos-asaas.md).

### Suporte (salão + Ops)

Opcional para o botão de contato rápido: `SUPPORT_WHATSAPP_E164` (DDI+número, só dígitos) e `SUPPORT_EMAIL`. Salão: **`/admin/suporte`**. Inbox Ops: **`/plataforma/suporte`**. Guia: [suporte.md](./suporte.md).

### Pagamento e gráficos no `/admin`

**Balcão:** dono/admin regista `paidAt` / método na lista ou `PATCH /api/admin/appointments/[id]`. **Online:** PIX pós-agendamento e clube via Asaas do salão (quando ligado). Gráficos: período **Hoje / 7 dias / Mês / 3 meses** (`chartRange`); `GET /api/admin/dashboard?chartRange=`.

### Web Push (notificação ao barbeiro no navegador)

Opcional. Com **`NEXT_PUBLIC_VAPID_PUBLIC_KEY`**, **`VAPID_PRIVATE_KEY`** e (recomendado) **`VAPID_SUBJECT`** (ex.: `mailto:contacto@seudominio.com`), o profissional pode ativar notificações em **`/admin/perfil`**; o ficheiro **`public/sw.js`** trata do evento push.

Gere um par de chaves: `npx web-push generate-vapid-keys`. A chave **pública** vai em `NEXT_PUBLIC_*`; a **privada** só no servidor (`VAPID_PRIVATE_KEY`). **Não commite** a privada.

### Next.js dev: `Compaction failed` / `ENOENT` em `.next\dev\...\build-manifest.json`

Sintomas: mensagens **Another write batch or compaction is already active**, **Persisting failed**, ou **no such file or directory** para ficheiros dentro de **`.next\dev`**.

Causas típicas: cache do **Turbopack** inconsistente; pasta **`.next`** apagada ou alterada com **`npm run dev` a correr**; **dois** servidores de dev ao mesmo tempo; antivírus / **OneDrive** a bloquear ficheiros na pasta do projeto (caminhos com espaços, ex. `Ze do corte`, agravam).

**Recuperação (ordem):**

1. Pare **todos** os `next dev` (feche terminais ou finalize processos `node` ligados ao projeto).
2. Apague a pasta **`.next`** na raiz do repositório (PowerShell, na raiz): `Remove-Item -Recurse -Force .next`
3. Suba de novo: **`npm run dev`**.

Se os erros **continuarem**, use o bundler clássico em desenvolvimento: **`npm run dev:webpack`** (`next dev --webpack`), que evita o cache interno do Turbopack.

### Prisma: `Unknown field` no desenvolvimento (Turbopack)

Depois de mudar o `schema.prisma`, rode **`npx prisma generate`** (e **`npx prisma db push`** se faltarem colunas no Postgres). Se o erro persistir com campos que já existem no schema, o Turbopack pode estar a usar um `@prisma/client` antigo em **`.next`**: apague a pasta **`.next`**, reinicie **`npm run dev`**. O **`next.config.ts`** inclui `@prisma/client` em **`serverExternalPackages`** para o runtime usar sempre o cliente gerado em **`node_modules`**.

Exemplo típico: **`Unknown field 'workWeekJson'`** em **`/admin/expediente`** — o código e o schema estão alinhados; falta sincronizar o **cliente** (`generate`) e a **tabela** (`db push`), depois limpar **`.next`** e voltar a subir o dev server.

### Prisma: coluna não existe no banco (ex.: `Service.unitId`)

O código espera o schema atual (`schema.prisma`), mas o Postgres local ficou atrás (sem migrações aplicadas). Sintoma: **`The column (not available) does not exist`** ou erro ao abrir a home.

1. Com base **vazia** ou só criada com **`migrate`**: na raiz do projeto, **`npx prisma migrate deploy`** (ou **`npx prisma migrate dev`** em desenvolvimento).
2. **`prisma migrate deploy`** falha com **P3005** (“database schema is not empty”): a base já tinha tabelas criadas com **`db push`** ou outro fluxo, sem histórico em **`_prisma_migrations`**. Ver [baselining](https://www.prisma.io/docs/guides/migrate/developing-and-baselines) na documentação Prisma, ou alinhe o schema manualmente com as migrações em **`prisma/migrations/`** e marque-as como aplicadas com **`prisma migrate resolve`** conforme o guia.

Se **`db push`** recusar adicionar **`unitId`** em **`Service`** porque já há linhas e a coluna seria obrigatória, é preciso uma migração que **adiciona a coluna, preenche e só depois define NOT NULL** (como em **`20260411120000_service_per_unit`**), não um push direto.

## Comandos npm (raiz do projeto)

| Comando | Uso |
|---------|-----|
| `npm run dev` | Servidor de desenvolvimento (http://localhost:3000), Turbopack |
| `npm run dev:webpack` | Mesmo que acima com **webpack** (se o Turbopack falhar no Windows) |
| `npm run build` / `npm start` | Produção local |
| `npm run start:prod` | Produção com **`prisma migrate deploy`** + **`ensure-owner`** + `next start` (Railway, etc.) |
| `instrumentation` (Next) | Em **produção**, arranque do servidor também executa **`ensure-owner`** lógico se `SEED_OWNER_*` estiver definido (reforço) |
| `npm run lint` | ESLint |
| `npx prisma generate` | Gera cliente Prisma (também em `postinstall`) |
| `npm run db:push` | Sincroniza schema com o banco |
| `npm run db:seed` | Serviços de exemplo, unidade matriz, proprietário e **vitrine Barbergon** (`siteJson`) |
| `npm run demo:vitrine` | Atualiza a org `ze-do-corte` com nome Barbergon + template `vitrine` (local ou `railway run npm run demo:vitrine`) |
| `npm run setup:admin` | `db:generate` + `db:push` + `db:seed` (preparar painel / BD) |
| `npm run create-owner` | Cria ou atualiza proprietário (`CREATE_OWNER_*` ou `SEED_OWNER_*` no `.env`) — ver [configurar-admin.md](./configurar-admin.md) |
| `npm run db:studio` | Prisma Studio |

## Windows: `INICIAR_ZE_DO_CORTE.bat`

Localização: raiz do repositório (junto a `package.json`).

Ordem aproximada:

1. `cd` para a pasta do `.bat`
2. Verifica **Node** no PATH
3. Cria `.env` a partir de `.env.example` se faltar
4. `npm install` se não existir `node_modules`
5. `npx prisma generate`
6. `npx prisma db push` (aviso se falhar; servidor pode mesmo assim abrir)
7. Nova janela CMD com `npm run dev`

Não substitui a configuração manual de segredos no `.env` (URL do banco, senhas de seed em produção).

## Build de produção

Exige `DATABASE_URL` no ambiente de build se a compilação importar Prisma. Não são necessárias chaves de terceiros para o login do painel.

Comando de arranque em hospedagem com migrações: **`npm run start:prod`** (`prisma migrate deploy` + `next start --hostname 0.0.0.0`). Detalhes para **Railway**: [railway.md](./railway.md).

Deploy resumido: [README.md](../README.md).

## Configurar o painel administrativo

Passo a passo (banco de dados, primeiro login, equipe): **[configurar-admin.md](./configurar-admin.md)**.  
Papéis e permissões: **[admin-hierarquia.md](./admin-hierarquia.md)**.

## URLs úteis em desenvolvimento

- Aplicação: `http://localhost:3000`
- Admin: `http://localhost:3000/admin` (ver [configurar-admin.md](./configurar-admin.md))
- Login do painel: `http://localhost:3000/admin/login`
- Lista de espera (lead B2B, só por link): `http://localhost:3000/lista-espera` → Ops em `/plataforma/leads`

## Erro P1001 — «Can't reach database server at localhost:5432»

Significa: **não há PostgreSQL escutando** no host/porta da sua `DATABASE_URL` (por padrão `localhost:5432`), ou a URL está errada.

### 1. Confirme que o PostgreSQL está instalado e em execução (Windows)

- **Serviços:** `Win + R` → `services.msc` → procure algo como **postgresql** / **PostgreSQL** → estado **Em execução**. Se estiver parado, **Iniciar**.
- **Instalador oficial:** [PostgreSQL Windows](https://www.postgresql.org/download/windows/) (inclui o serviço).
- **Laragon / XAMPP:** normalmente trazem **MySQL**, não Postgres. Este projeto usa **PostgreSQL**; ou instale o Postgres à parte, ou use **Docker** / **Neon** (URL remota na `DATABASE_URL`).

### 2. Confirme a `DATABASE_URL` no `.env`

Substitua `USER` e `PASSWORD` por um usuário real (ex.: `postgres` e a senha que você definiu na instalação). O banco `ze_do_corte` precisa existir (ou o Postgres precisa permitir criá-lo). Exemplo:

```env
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/ze_do_corte?schema=public"
```

- Se o Postgres usar **outra porta** (ex. 5433), altere na URL.
- Se usar **Docker** (`docker run -p 5432:5432 ...`), o host continua `localhost` e a porta é a mapeada.

### 3. Criar o banco (se ainda não existir)

No **pgAdmin** ou `psql`:

```sql
CREATE DATABASE ze_do_corte;
```

Depois, na pasta do projeto:

```bash
npx prisma db push
```

### 4. Teste rápido de porta (PowerShell)

```powershell
Test-NetConnection -ComputerName localhost -Port 5432
```

Se `TcpTestSucceeded : False`, o servidor não está escutando nessa porta.

Documentação Prisma: [P1001](https://www.prisma.io/docs/orm/reference/error-reference#p1001).

# Operação — ambiente, scripts e arranque

## Pré-requisitos

- **Node.js 20+**
- **PostgreSQL** acessível pela `DATABASE_URL` **ou** **Docker Desktop** para desenvolvimento local automático
- Conta **Clerk** e chaves no `.env`

## PostgreSQL local com Docker (recomendado)

1. Instale e inicie o **Docker Desktop**.
2. Na raiz do repositório, execute **`PREPARAR_BASE.bat`** ou:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/preparar-postgres.ps1
```

Isto executa `docker compose up -d` (ficheiro [`docker-compose.yml`](../docker-compose.yml)), aguarda a base, define no `.env`:

`postgresql://postgres:ze_docorte_dev@localhost:5432/ze_do_corte?schema=public`

e corre `prisma generate`, `prisma db push` e `prisma db seed`.

- **Utilizador / palavra-passe de desenvolvimento:** `postgres` / `ze_docorte_dev` (apenas local).
- **Parar o container:** `docker compose down` (na raiz). **Dados:** volume Docker `ze_do_corte_pgdata`.
- Se a porta **5432** estiver ocupada por outro Postgres, pare esse serviço ou altere o mapeamento de portas no `docker-compose.yml` e a `DATABASE_URL`.

## Variáveis de ambiente

Copiar modelo e editar:

```bash
cp .env.example .env
```

Descrição detalhada das variáveis: [README.md](../README.md) (tabela) e [.env.example](../.env.example).

## Comandos npm (raiz do projeto)

| Comando | Uso |
|---------|-----|
| `npm run dev` | Servidor de desenvolvimento (http://localhost:3000) |
| `npm run build` / `npm start` | Produção local |
| `npm run lint` | ESLint |
| `npx prisma generate` | Gera cliente Prisma (também em `postinstall`) |
| `npm run db:push` | Sincroniza schema com a BD |
| `npm run db:seed` | Popula serviços de exemplo |
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

Não substitui a configuração manual de segredos no `.env` (Clerk, URL da base).

## Build de produção

Exige `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` e `CLERK_SECRET_KEY` definidas no ambiente (CI/Vercel), além de `DATABASE_URL` se a build tocar em código que importa Prisma no build.

Deploy resumido: [README.md](../README.md) secção **Deploy**.

## URLs úteis em desenvolvimento

- Aplicação: `http://localhost:3000`
- Admin: `http://localhost:3000/admin` (após login Clerk + e-mail em `ADMIN_EMAILS` em produção)
- Login: `http://localhost:3000/sign-in`

## Erro P1001 — «Can't reach database server at localhost:5432»

Significa: **não há PostgreSQL a escutar** no host/porta da sua `DATABASE_URL` (por defeito `localhost:5432`), ou a URL está errada.

### 1. Confirme que o PostgreSQL está instalado e a correr (Windows)

- **Serviços:** `Win + R` → `services.msc` → procure algo como **postgresql** / **PostgreSQL** → estado **Em execução**. Se estiver parado, **Iniciar**.
- **Instalador oficial:** [PostgreSQL Windows](https://www.postgresql.org/download/windows/) (inclui o serviço).
- **Laragon / XAMPP:** por norma trazem **MySQL**, não Postgres. Este projeto usa **PostgreSQL**; ou instala o Postgres à parte, ou usa **Docker** / **Neon** (URL remota na `DATABASE_URL`).

### 2. Confirme a `DATABASE_URL` no `.env`

Substitua `USER` e `PASSWORD` por um utilizador real (ex.: `postgres` e a password que definiu na instalação). O nome da base `ze_do_corte` tem de existir (ou o Postgres tem de permitir criá-la). Exemplo:

```env
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/ze_do_corte?schema=public"
```

- Se o Postgres usar **outra porta** (ex. 5433), altere na URL.
- Se usar **Docker** (`docker run -p 5432:5432 ...`), o host continua `localhost` e a porta a mapeada.

### 3. Criar a base (se ainda não existir)

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

Se `TcpTestSucceeded : False`, o servidor não está a escutar nessa porta.

Documentação Prisma: [P1001](https://www.prisma.io/docs/orm/reference/error-reference#p1001).

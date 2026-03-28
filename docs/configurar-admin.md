# Configurar o painel administrativo (`/admin`)

Guia em ordem lógica. O painel usa **e-mail e senha** guardados na tabela **`StaffMember`**, com **sessão** na tabela **`Session`** e cookie HTTP-only (ver também [admin-hierarquia.md](./admin-hierarquia.md)).

### Atalho na raiz do projeto

Equivale aos passos da seção **1** (generate + push + seed):

```bash
npm run setup:admin
```

---

## 1. Banco de dados (PostgreSQL)

1. Defina `DATABASE_URL` no `.env` (modelo em [`.env.example`](../.env.example)). Sem Postgres em execução, os comandos abaixo falham — ver [operacao.md](./operacao.md).
2. Opcional no `.env` antes do seed:

   - `SEED_OWNER_EMAIL` — e-mail do primeiro proprietário (padrão: `admin@zdc.local`)
   - `SEED_OWNER_PASSWORD` — senha com **mínimo 6 caracteres** (padrão de exemplo no `.env.example`)

3. Na raiz do projeto:

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

Ou: `npm run setup:admin`.

Isto cria/atualiza tabelas (incl. `StaffMember`, `Session`, `BarbershopUnit`, etc.), dados iniciais (serviços, unidade matriz) e, se ainda não existir, um **proprietário** (`OWNER`) para login em **`/admin/login`**.

### Criar ou redefinir um proprietário depois (sem rodar o seed completo)

1. No `.env`, defina (ou use `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` como fallback):

   - `CREATE_OWNER_EMAIL` — e-mail de login
   - `CREATE_OWNER_PASSWORD` — senha com **mínimo 6 caracteres**
   - `CREATE_OWNER_NAME` — (opcional) nome de exibição

2. Na raiz do projeto:

```bash
npm run create-owner
```

O comando faz **upsert**: cria o registo ou atualiza papel para `OWNER`, redefine a senha (bcrypt) e **encerra sessões antigas** desse utilizador. Depois entre em **`/admin/login`** com o e-mail e a senha novos.

**Se alterar o `schema.prisma`**, rode de novo `npx prisma generate`. Se o `/admin` der erro estranho com Prisma, apague a pasta **`.next`** e reinicie `npm run dev`.

---

## 2. Primeiro acesso

1. Abra **`/admin/login`** (ou `http://localhost:3000/admin/login` em desenvolvimento).
2. Use o e-mail e a senha definidos por `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` (ou os padrões do seed, se não configurou).
3. Após entrar, **troque a senha** criando um novo membro com papel adequado ou, no futuro, por fluxo de redefinição — hoje a alteração pode ser feita via API `PATCH /api/admin/staff/[id]` com `newPassword` (apenas para quem tem permissão na equipe).

Rotas antigas **`/sign-in`** redirecionam para **`/admin/login`**.

---

## 3. Quem pode entrar no painel

- Apenas utilizadores com linha em **`StaffMember`** e **`passwordHash`** preenchido (bcrypt).
- **Funcionários (`STAFF`)** precisam de **`unitId`** obrigatório. Sem unidade, o login é recusado.

Não há mais listas `ADMIN_EMAILS` / `OWNER_EMAILS` nem Clerk: o controlo é só pela tabela e pelas senhas.

### Funcionários (uma unidade)

Um administrador ou proprietário entra no painel → **Equipe** (`/admin/equipe`) → adiciona e-mail, papel **Funcionário**, **unidade** e **senha inicial** (mín. 6 caracteres). Entregue a senha ao colaborador por um canal seguro. Na mesma lista, cada funcionário tem **Página inicial**: texto curto e **Mostrar na home** (a foto vem de **Meu perfil** de cada um). O **e-mail do cadastro** é o destino das notificações **Resend** quando um agendamento fica atribuído a esse barbeiro (ver `docs/operacao.md`).

---

## 4. Agendamentos e barbeiros

Reservas feitas pelo **site** ficam com **Profissional** em branco até um **proprietário** ou **administrador** abrir `/admin` e escolher o funcionário na lista. Sem essa atribuição, o **barbeiro** (`STAFF`) **não** vê esse agendamento no painel (nem nas métricas). O Excel exportado inclui a coluna **Profissional**.

---

## 5. Depois do primeiro login

| Seção | Rota | Notas |
|--------|------|--------|
| Visão geral | `/admin` | Métricas e tabela de agendamentos |
| Meu perfil | `/admin/perfil` | Nome de exibição, telefone, foto (Cloudinary se `CLOUDINARY_*` no `.env`) e alteração de senha |
| Unidades | `/admin/unidades` | Unidade padrão = onde o site público agenda |
| Equipe | `/admin/equipe` | Membros, papéis e senhas iniciais; por funcionário, bio e visibilidade na home |
| Serviços | `/admin/servicos` | Preços e durações |
| Configuração | `/admin/configuracao` | Textos institucionais (só **proprietário**) |

Use **Sair** na barra do painel para encerrar a sessão (`POST /api/auth/logout`).

---

## 6. Problemas frequentes

| Sintoma | O que fazer |
|---------|-------------|
| Redireciona para `/admin/login` ao abrir `/admin` | Sessão inválida ou expirada — faça login de novo. |
| "E-mail ou senha incorretos" | Utilizador sem `passwordHash`, senha errada ou e-mail não cadastrado em `StaffMember`. Rode o seed ou crie o membro em Equipe. |
| Funcionário não vê agendamentos na lista | Atribua um **Profissional** na coluna da tabela em `/admin` (só dono/admin); reservas do site entram sem barbeiro. |
| Erro com `staffMember` / `findFirst` | `npx prisma generate`, apagar `.next`, reiniciar `npm run dev`. |
| `Unknown field unit` em `Appointment` | Cliente Prisma antigo — rode `npx prisma generate`. |
| `Can't reach database server` | Postgres não está em execução ou `DATABASE_URL` errada — ver [operacao.md](./operacao.md#erro-p1001--cant-reach-database-server-at-localhost5432). |
| Export Excel 403 | Papel **Funcionário** não exporta — é esperado. |

---

## 7. Deploy (Vercel ou outro)

1. Definir no ambiente: `DATABASE_URL`, e para o primeiro utilizador use seed com `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` **fortes** (ou crie o proprietário manualmente no banco com hash bcrypt).
2. Após deploy: `npx prisma migrate deploy` **ou** `prisma db push` (conforme o fluxo de vocês) contra o banco de produção.
3. Opcional: rodar seed uma vez se precisarem dos serviços de exemplo e do proprietário inicial.

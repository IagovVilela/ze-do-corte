# Zé do Corte - Sistema Web de Barbearia

Sistema completo para barbearia com:

- Site institucional premium (home, serviços, contato)
- Agendamento online com bloqueio automático de horários
- Painel administrativo com tabela, métricas e exportação para Excel

Tecnologias:

- Next.js (App Router) + React + TypeScript
- Tailwind CSS + Framer Motion
- Prisma ORM + PostgreSQL
- Recharts (dashboard) + XLSX (exportação)

## Requisitos

- Node.js 20+
- PostgreSQL disponível

## Configuração rápida

1. Instale as dependências:

```bash
npm install
```

2. Configure o banco no `.env`:

```bash
cp .env.example .env
```

Edite `DATABASE_URL` no `.env` com sua string de conexão PostgreSQL.

3. Gere o client Prisma:

```bash
npx prisma generate
```

4. Sincronize o schema no banco:

```bash
npm run db:push
```

5. (Opcional) Popule serviços iniciais:

```bash
npm run db:seed
```

6. Rode o projeto:

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Rotas principais

- `/` - Institucional
- `/agendar` - Agendamento online
- `/admin` - Painel administrativo

## APIs

- `GET /api/services`
- `GET /api/appointments/available?serviceId=...&date=YYYY-MM-DD`
- `POST /api/appointments`
- `GET /api/admin/dashboard`
- `GET /api/admin/export`

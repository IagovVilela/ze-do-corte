# Painel administrativo — hierarquia e permissões

O painel (`/admin` e `/api/admin/*`) distingue **três papéis**. O acesso vem só de um registo em **`StaffMember`** com **`passwordHash`** (login em `/admin/login`); a sessão fica na tabela **`Session`** e num cookie HTTP-only.

Funcionários (**STAFF**) **precisam** de **`unitId`** obrigatório. Sem unidade, o login ao painel é negado.

## Matriz de capacidades

| Capacidade | Proprietário (`OWNER`) | Administrador (`ADMIN`) | Funcionário (`STAFF`) |
|------------|------------------------|-------------------------|------------------------|
| Ver agendamentos (lista + métricas) | Todas as unidades | Todas as unidades | Só os **atribuídos a si** (`Appointment.staffMemberId`) |
| Clientes (contagem por telefone distinto) | Sim | Sim | Só clientes dos seus agendamentos atribuídos |
| Faturamento (mês, serviços `COMPLETED`) | Sim | Sim | Não |
| Gráfico 7 dias / próximo horário | Sim | Sim | Sim (só dados dos agendamentos atribuídos a si) |
| **Atribuir barbeiro** na lista de agendamentos | Sim | Sim | Não |
| Exportar Excel | Sim | Sim | Não |
| **Unidades** — criar, ativar/inativar, definir padrão | Sim | Sim | Não |
| **Unidades** — editar nome, slug, endereço, cidade, telefone | Sim | Não | Não |
| **Unidades** — excluir | Sim | Não | Não |
| **Equipe** — criar/editar/remover | Todos os papéis (incl. outro proprietário) | Só **funcionários** | Não |
| **Equipe** — expediente (`workWeekJson`) de cada **STAFF** | Sim | Sim (só funcionários que pode alterar) | Não |
| **Serviços** — editar preços/descrição/duração | Sim | Sim | Não |
| **Configuração** (textos `BarbershopSetting`) | Sim | Não | Não |
| **Meu perfil** (`/admin/perfil` — nome, telefone, foto, senha) | Sim | Sim | Sim |
| **Meu expediente** (`/admin/expediente` — `workWeekJson`) | Não | Não | Sim |

### Profissional por agendamento (`staffMemberId`)

- Cada `Appointment` pode ter um **barbeiro** (`staffMemberId` → `StaffMember` com papel `STAFF`).
- Reservas pelo site público entram **sem** profissional (`staffMemberId` nulo) até o **dono ou administrador** escolher o barbeiro na coluna **Profissional** em `/admin`.
- **Funcionários** só veem agendamentos em que **são o profissional atribuído**; métricas e gráficos do painel usam o mesmo filtro (produção individual).
- `PATCH /api/admin/appointments/[id]` com `{ "staffMemberId": "<id>" | null }` — só `OWNER` / `ADMIN`. O profissional tem de ser `STAFF` e da **mesma unidade** do agendamento; o horário do agendamento tem de caber no **expediente** desse profissional se ele tiver `workWeekJson` personalizado.

### Agendamento público e unidades

- Novos agendamentos recebem automaticamente a **unidade padrão** (`BarbershopUnit.isDefault`).
- Conflitos de horário e slots na unidade: sem `staffMemberId` na API, comportamento global da unidade; **com** `staffMemberId`, também se aplica o expediente personalizado do barbeiro (`workWeekJson`), se existir.
- `GET /api/appointments/available` aceita `unitId` opcional; sem parâmetro usa a unidade padrão.

### Senhas e sessões

- Senhas são armazenadas com **bcrypt** (`passwordHash` em `StaffMember`).
- O cookie guarda um token opaco; na base guarda-se o **SHA-256** do token (`Session.tokenHash`).
- `PATCH /api/admin/staff/[id]` com `newPassword` redefine a senha e **invalida** as sessões desse membro.

## Variáveis de ambiente

Ver [`.env.example`](../.env.example): `DATABASE_URL`, `SEED_OWNER_EMAIL`, `SEED_OWNER_PASSWORD` (usadas pelo `prisma db seed`).

## Arquivos relacionados

- `src/lib/staff-access.ts` — papéis e `appointmentScopeWhere`.
- `src/lib/admin-auth.ts` — `getStaffAccessOrNull`, `requireStaffApiAuth`, cookies de sessão.
- `src/lib/session-cookie.ts` — criação e resolução de sessão.
- `src/app/api/auth/login`, `logout` — entrada e saída.
- `src/app/api/admin/*` — rotas com verificação de permissões.
- `prisma/schema.prisma` — `StaffRole`, `StaffMember` (incl. `phone`, `profileImageUrl`, `profileImagePublicId`), `Session`, `BarbershopUnit`, `BarbershopSetting`, `Service` + `ServiceCategory`, `Appointment.unitId`, `Appointment.staffMemberId`.

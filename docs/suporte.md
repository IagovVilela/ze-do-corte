# Suporte (salão ↔ Barbernegon)

Central de ajuda, chamados e contato rápido no painel do salão; inbox no Ops.

## Salão — `/admin/suporte`

Três abas:

1. **Ajuda** — artigos embutidos (`src/lib/support-articles.ts`): site, agenda, WhatsApp, pagamentos, clube, plano SaaS.
2. **Meus chamados** — lista e thread da própria organização.
3. **Falar conosco** — WhatsApp/e-mail da plataforma + formulário de novo chamado.

Item **Suporte** no grupo Conta da sidebar. Links contextuais em `/admin/whatsapp` e `/admin/pagamentos` apontam para `#contato`.

## Consultores — `/consultores`

Ambiente exclusivo da equipe de suporte (não é o Ops).

1. Ops cria contas em `/plataforma/consultores`.
2. Consultor entra em `/consultores/login?k=SUPPORT_CONSULTANT_GATE`. Se usar o formulário do Ops com a conta de consultor, o login redireciona para `/consultores` (não abre o console Ops).
3. Inbox de chamados (`SupportTicket`); ficha da barbearia sem secrets.
4. **Abrir painel (assistência)** cria sessão `SUPPORT_ASSIST` no salão: agenda, site e WhatsApp em leitura; telefones mascarados; sem caixa, Asaas, plano, senhas. Banner **Voltar ao console**.
5. Auditoria em `SupportAccessLog` (Ops vê em `/plataforma/consultores`).

Consultor **não** acessa `/plataforma` (métricas, excluir org, impersonar OWNER).

| Variável | Uso |
|----------|-----|
| `SUPPORT_CONSULTANT_GATE` | Segredo da URL de entrada; sem ele, login 404 |

APIs: `/api/consultores/*` (`requireConsultantApiAuth`).

## Ops — `/plataforma/suporte`

Inbox filtrável por status; detalhe com thread; mudar status; responder (marca `IN_PROGRESS` se estava `OPEN`).

Identidade na sidebar: **Suporte Barbernegon** (`PLATFORM_SUPPORT_DISPLAY_NAME`).

### Notificação de chamado novo

1. **No Ops (ao vivo):** com `/plataforma` aberto, a sidebar consulta chamados abertos a cada ~15s — badge no item Suporte + toast (e, se permitido, notificação do navegador). Link “Ativar alerta no navegador” pede permissão.
2. **E-mail:** ao `POST` de novo chamado, envia para `SUPPORT_EMAIL` via Resend (`RESEND_API_KEY` + `RESEND_FROM_EMAIL`). Sem isso, só log no servidor; o toast do Ops continua funcionando.

## APIs

| Rota | Auth |
|------|------|
| `GET /api/admin/support/contact` | staff |
| `GET`/`POST /api/admin/support/tickets` | staff (só da org) |
| `GET`/`POST /api/admin/support/tickets/[id]/messages` | staff (só da org) |
| `GET /api/platform/support/tickets` | ops (`PLATFORM_ADMIN_EMAILS`) |
| `GET`/`PATCH /api/platform/support/tickets/[id]` | ops |
| `POST /api/platform/support/tickets/[id]/messages` | ops |
| `/api/consultores/*` | consultor (`SUPPORT_CONSULTANT`) |
| `GET`/`POST /api/plataforma/consultores` | ops |
| `GET /api/plataforma/consultores/audit` | ops |

## Variáveis de ambiente

| Variável | Uso |
|----------|-----|
| `SUPPORT_WHATSAPP_E164` | Dígitos com DDI (ex. `5512996373335`) → botão wa.me. Sem env, usa o padrão da plataforma. |
| `SUPPORT_EMAIL` | E-mail exibido / `mailto:` e destino do aviso de chamado novo. Sem env, usa o padrão da plataforma. |
| `SUPPORT_CONSULTANT_GATE` | Segredo da entrada `/consultores/login?k=` |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Envio do e-mail de novo chamado ao Ops |

Sem essas vars, a aba Contato avisa que ainda não está configurado; chamados continuam funcionando.

## Dados

Migração `prisma/migrations/20260721180000_support_tickets` (`SupportTicket`). Consultores: `20260816153000_support_consultants` (`SupportAccessLog`, papéis `SUPPORT_CONSULTANT` / `SUPPORT_ASSIST`).

# Suporte (salão ↔ Barbernegon)

Central de ajuda, chamados e contato rápido no painel do salão; inbox no Ops.

## Salão — `/admin/suporte`

Três abas:

1. **Ajuda** — artigos embutidos (`src/lib/support-articles.ts`): site, agenda, WhatsApp, pagamentos, clube, plano SaaS.
2. **Meus chamados** — lista e thread da própria organização.
3. **Falar conosco** — WhatsApp/e-mail da plataforma + formulário de novo chamado.

Item **Suporte** no grupo Conta da sidebar. Links contextuais em `/admin/whatsapp` e `/admin/pagamentos` apontam para `#contato`.

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

## Variáveis de ambiente

| Variável | Uso |
|----------|-----|
| `SUPPORT_WHATSAPP_E164` | Dígitos com DDI (ex. `5512996373335`) → botão wa.me. Sem env, usa o padrão da plataforma. |
| `SUPPORT_EMAIL` | E-mail exibido / `mailto:` e destino do aviso de chamado novo. Sem env, usa o padrão da plataforma. |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Envio do e-mail de novo chamado ao Ops |

Sem essas vars, a aba Contato avisa que ainda não está configurado; chamados continuam funcionando.

## Dados

Migração `prisma/migrations/20260721180000_support_tickets`. Modelos `SupportTicket` e `SupportTicketMessage`.

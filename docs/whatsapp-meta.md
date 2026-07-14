# WhatsApp Cloud API (Meta)

Integração oficial multi-tenant: cada barbearia conecta o próprio número Business; o Barbernegon recebe um webhook único e o bot agenda / remarca / cancela.

## Variáveis de ambiente (plataforma)

No serviço Railway / `.env`:

| Variável | Uso |
|----------|-----|
| `META_APP_ID` | App Meta (opcional na UI) |
| `META_APP_SECRET` | Validar assinatura `X-Hub-Signature-256` |
| `META_WEBHOOK_VERIFY_TOKEN` | Token do challenge GET do webhook |
| `META_GRAPH_VERSION` | Default `v21.0` |
| `WHATSAPP_TOKEN_ENCRYPTION_KEY` | Criptografa access tokens por org (obrigatória para gravar token) |
| `META_WA_TEMPLATE_CONFIRMATION` | Nome do template aprovado (opcional) |
| `META_WA_TEMPLATE_REMINDER` | Nome do template de lembrete (opcional) |

## Webhook

URL pública:

`https://SEU_DOMINIO/api/webhooks/whatsapp`

No painel Meta → WhatsApp → Configuration:

1. Callback URL = URL acima  
2. Verify token = mesmo valor de `META_WEBHOOK_VERIFY_TOKEN`  
3. Assinar o campo `messages`

O tenant é resolvido por `metadata.phone_number_id` = `Organization.whatsappPhoneNumberId`.

## Por barbearia (`/admin/whatsapp`)

OWNER/ADMIN com `manageBranding`:

1. Colar **Phone number ID**, número exibido e **access token** (temporário ou permanente da WABA).  
2. Ativar **Bot ativo**.  
3. Salvar.

O token é armazenado criptografado (`whatsappAccessTokenEnc`). Nunca aparece em GETs.

Embedded Signup (Tech Provider) fica como evolução — hoje a conexão é manual no admin.

## Fluxo do bot

Palavras `menu` / `oi` / `ajuda` reabrem o menu.

- **Agendar** → unidade (se >1) → serviço → dia → horário → nome → cria `Appointment` (`bookingSource=whatsapp`)  
- **Remarcar** / **Cancelar** → lista próximos do mesmo telefone na org  

Regras de horário iguais ao site (`booking-domain` + `assertPublicBookingSlot`).

## Confirmação e lembretes

- Após criar no site ou no bot: tenta template de confirmação; se falhar / ausente, envia texto (válido dentro da janela de 24h).  
- Cancelamento pelo link de gestão também notifica no WhatsApp se o bot estiver ligado.  
- Lembretes: `npm run whatsapp:reminders` (cron Railway a cada hora, por exemplo). Marca `whatsappReminderSentAt`.

## Templates Meta

Fora da janela de 24h é obrigatório template aprovado. Crie na WABA textos em `pt_BR` com variáveis (nome, serviço, data/hora) e aponte os nomes nas env `META_WA_TEMPLATE_*`.

## Migração

SQL: `prisma/migrations/20260714200000_whatsapp_cloud_api`. Em produção: `prisma migrate deploy` (já no `start:prod`).

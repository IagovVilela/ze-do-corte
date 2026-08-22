# WhatsApp Cloud API (Meta)

Integração oficial multi-tenant: cada barbearia conecta o próprio número Business; o Barbernegon recebe um webhook único e o bot agenda / remarca / cancela.

## Checklist de teste (rápido)

### 1. Variáveis na Railway (plataforma)

| Variável | Status |
|----------|--------|
| `WHATSAPP_TOKEN_ENCRYPTION_KEY` | Obrigatória para salvar token no admin |
| `META_WEBHOOK_VERIFY_TOKEN` | Obrigatória para o challenge do webhook |
| `META_GRAPH_VERSION` | `v21.0` |
| `META_APP_ID` / `META_APP_SECRET` | Coloque quando tiver o App Meta (Secret valida assinatura POST; **não** bloqueia mais o painel) |

Sem `META_APP_SECRET` o GET do webhook ainda funciona e o painel libera o assistente; o POST aceita eventos sem validar assinatura (útil no teste inicial). Com secret configurado, a assinatura passa a ser exigida.

### 2. App Meta

1. Abra [developers.facebook.com](https://developers.facebook.com/) → **Meus apps** → **Criar app** → tipo **Business**.
2. Adicione o produto **WhatsApp**.
3. Em **Configurações → Básico**: copie **ID do app** (`META_APP_ID`) e **Chave secreta** (`META_APP_SECRET`) → grave na Railway.
4. Em **WhatsApp → Configuração da API** (API Setup):
   - Copie **Phone number ID**
   - Copie **Token de acesso** (temporário serve para teste; depois use permanente da WABA)
   - Anote o **número de teste** da Meta

### 3. Webhook no Meta

URL de callback (produção Barbernegon):

`https://barbernegon-production.up.railway.app/api/webhooks/whatsapp`

1. WhatsApp → **Configuration** → Edit callback URL  
2. **Callback URL** = URL acima  
3. **Verify token** = o mesmo valor de `META_WEBHOOK_VERIFY_TOKEN` na Railway  
4. Assinar o campo **`messages`** → Verify and save  

Se der verde/ok, o challenge GET passou.

### 4. Ligar na barbearia

1. Login no painel → **`/admin/whatsapp`**
2. Abra a seção do assistente
3. Cole **Phone number ID**, **número exibido** e **access token**
4. Marque **Bot ativo** → Salvar

### 5. Testar o bot

1. No WhatsApp, envie mensagem para o número de teste (na Meta, adicione seu celular como destinatário de teste se pedido)
2. Escreva `oi` ou `menu`
3. Siga: Agendar → serviço → dia → horário → nome
4. Confira o agendamento no painel admin (`bookingSource=whatsapp`)

Templates (`META_WA_TEMPLATE_*`) **não são necessários** enquanto o cliente escreveu nas últimas 24h.

---

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

- Após criar no site, no bot ou no agente Plus+: envia **comanda WhatsApp** com serviços, horários, profissional (se houver), total e link `/minha-reserva/{token}` para o cliente gerenciar.
- **Com template configurado** (`META_WA_TEMPLATE_CONFIRMATION`): envia o **modelo aprovado primeiro** (obrigatório para quem ainda não falou no WhatsApp). Se o template falhar, tenta texto livre.
- **Sem template**: só texto livre — a Meta **bloqueia** se o cliente não escreveu nas últimas 24h (erro 131047).
- Cancelamento pelo link de gestão também notifica no WhatsApp se o bot estiver ligado.
- Lembretes automáticos (toggle em `/admin/whatsapp`):
  - **~24h antes** (janela +20h…+26h) → marca `whatsappReminderSentAt`
  - **~2h antes** (janela +90…+150 min) → marca `whatsappNearReminderSentAt`
  - Com `META_WA_TEMPLATE_REMINDER` / `_NEAR`: **template primeiro**; senão só texto (falha fora da janela 24h).
  - Rodar a cada **15–30 min**: `npm run whatsapp:jobs` **ou** HTTP `GET|POST /api/cron/whatsapp-jobs` com `Authorization: Bearer $CRON_SECRET` (ou `?secret=`). Sem `CRON_SECRET` o endpoint HTTP responde 401.

## Templates Meta (obrigatórios para iniciar conversa)

A Meta **não permite** a barbearia iniciar mensagem de texto livre, botão ou IA se o cliente não falou nas últimas 24h. Não há “jeitinho” no código: a única forma oficial é **modelo (template) aprovado**.

Fluxo correto:

1. Sistema envia **template** (comanda / lembrete / reativação).
2. Cliente **responde** (qualquer coisa).
3. Abre a janela de 24h → bot e agente de IA podem conversar em texto livre.

### Como criar (Gerenciador do WhatsApp / Meta Business)

1. Acesse [business.facebook.com](https://business.facebook.com/) → Conta WhatsApp → **Modelos de mensagem**.
2. Crie em `pt_BR`, categoria **Utilidade** (confirmação/lembrete) ou **Marketing** (reativação).
3. Exemplos de corpo:
   - Confirmação: `Olá {{1}}! Seu horário em {{2}} ficou para {{3}}. Gerenciar: {{4}}`
   - Lembrete: `Oi {{1}}, lembrete: {{2}} em {{3}}. Link: {{4}}`
4. Aguarde aprovação (pode levar minutos a dias).
5. Na Railway, defina o **nome exato** do modelo:
   - `META_WA_TEMPLATE_CONFIRMATION=`
   - `META_WA_TEMPLATE_REMINDER=`
   - `META_WA_TEMPLATE_REMINDER_NEAR=` (opcional)
   - `META_WA_TEMPLATE_WINBACK=` (Plus+)
6. Redeploy. No `/admin/whatsapp` o checklist deve marcar os modelos como ativos.

Reativação Plus+: `META_WA_TEMPLATE_WINBACK` (nome, dias, salão). Embedded Signup (botão Facebook no admin) continua como evolução — hoje a conexão é Phone number ID + token em `/admin/whatsapp`.

## Migração

SQL: `prisma/migrations/20260714200000_whatsapp_cloud_api`. Em produção: `prisma migrate deploy` (já no `start:prod`).

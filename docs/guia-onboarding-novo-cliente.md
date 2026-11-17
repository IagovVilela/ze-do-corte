# Guia: ativar um cliente novo (Barbernegon)

Use este guia **toda vez** que um salão novo entrar.  
Checklist marcável: [checklist-onboarding-salao.md](./checklist-onboarding-salao.md).

**Produção:** https://barbernegon-production.up.railway.app

---

## O que você precisa ter em mãos

| Item | Exemplo / onde pegar |
|------|----------------------|
| Nome do salão + slug | combinado com o dono |
| WhatsApp do dono | para a call |
| E-mail de login Barbernegon | cadastro |
| E-mail / acesso Meta Business | tela compartilhada na call |
| Número do chip do salão | +55 DDD… |
| Plano vendido | Free · Pro · Plus+ |
| (Pro) vontade de receber PIX | sim/não → Asaas |

---

## Links (deixe abertos na call)

| Uso | URL |
|-----|-----|
| Login admin do salão | https://barbernegon-production.up.railway.app/admin/login |
| WhatsApp do salão | https://barbernegon-production.up.railway.app/admin/whatsapp |
| Pagamentos Asaas | https://barbernegon-production.up.railway.app/admin/pagamentos |
| Plano SaaS | https://barbernegon-production.up.railway.app/admin/plano |
| Clube | https://barbernegon-production.up.railway.app/admin/clube |
| Meta Business | https://business.facebook.com/ |
| Modelos WhatsApp | https://business.facebook.com/wa/manage/message-templates/ |
| Meta Developers | https://developers.facebook.com/apps/ |
| Asaas | https://www.asaas.com/ |
| Railway | https://railway.app/ |
| Webhook WhatsApp (colar na Meta) | `https://barbernegon-production.up.railway.app/api/webhooks/whatsapp` |

---

## Visão geral (o que repetir por cliente)

```
1. Montar o salão no painel
2. Número no site
3. (Pro) Asaas + clube
4. Número na Meta Cloud API
5. Phone ID + token no /admin/whatsapp + bot ligado
6. Testar oi → agendar
7. Submeter templates (WABA desse número)
8. (Plus+) plano PLUS + winback quando aprovado
```

**Não repetir por cliente:** cron, verify token da Railway, chaves Gemini, Asaas da plataforma, URL do webhook.

---

## Passo 1 — Conta e operação do salão (15–30 min)

1. Garanta cadastro/login do dono em  
   https://barbernegon-production.up.railway.app/admin/login
2. No painel, cadastre (ou revise com ele):
   - unidades / dados do salão  
   - **serviços** (nome, duração, preço)  
   - **equipe** (barbeiros)  
   - **horários**  
   - site / branding  
3. Teste: abrir `/{slug}` e `/{slug}/agendar` e fazer 1 reserva teste.
4. Em `/admin/plano`, deixe o plano contratado (Free / Pro / Plus+ / trial).

Sem serviços e horários, o bot **não** agenda direito.

---

## Passo 2 — Número no site (1 min)

1. Abra `/admin/whatsapp`
2. Campo **Número de WhatsApp da barbearia** (com DDD) → Salvar  
3. Confira o botão WhatsApp no site público.

Isso **não** liga o assistente ainda — só o link `wa.me`.

---

## Passo 3 — Asaas (só Pro / Plus+ / quem recebe PIX)

1. Dono cria conta: https://www.asaas.com/
2. KYC + conta bancária para saque
3. Copiar **API Key**
4. Colar em `/admin/pagamentos` → marcar **Quero receber online** → Salvar  
   (webhook do salão é automático)
5. Se for usar clube: criar planos em `/admin/clube` e testar `/{slug}/clube`

Guia: [pagamentos-asaas.md](./pagamentos-asaas.md)

---

## Passo 4 — Meta Cloud API (assistente)

### 4.1 Número e API

1. https://developers.facebook.com/apps/ → app Barbernegon (ou o app da operação)
2. Caso de uso **Conectar no WhatsApp** → **Integrar com API**
3. **Etapa 2 — Configuração da produção:**
   - registrar/verificar o **número do salão**
   - webhook =  
     `https://barbernegon-production.up.railway.app/api/webhooks/whatsapp`  
   - verify token = valor de `META_WEBHOOK_VERIFY_TOKEN` na Railway  
   - assinar **`messages`**
4. Anotar:
   - **Phone number ID** (número longo)
   - **Access token**

### 4.2 Colar no Barbernegon

1. `/admin/whatsapp` → opções do assistente  
2. Colar Phone number ID + token  
3. Marcar:
   - Ligar assistente  
   - Enviar comanda ao agendar  
   - Lembretes automáticos  
4. **Salvar**

### 4.3 Teste obrigatório

1. De **outro** celular, mande `oi` ou `menu` para o número Cloud do salão  
2. Agende um horário completo  
3. Confira no `/admin`  
4. Se der erro nos logs (“nenhum salão com Phone number ID X”), o ID no painel está **errado** — corrija e salve de novo  

Aqui o **bot já funciona** (conversa nas 24h).

Detalhes: [whatsapp-meta.md](./whatsapp-meta.md)

---

## Passo 5 — Templates Meta (avisos 100%)

Criar na WABA **desse número**:  
https://business.facebook.com/wa/manage/message-templates/

Idioma: **Portuguese (BR)**.  
Depois de **aprovados**, nomes na Railway (exatos):

```text
META_WA_TEMPLATE_CONFIRMATION=confirmacao_agendamento
META_WA_TEMPLATE_REMINDER=lembrete_horario
META_WA_TEMPLATE_REMINDER_NEAR=lembrete_proximo
META_WA_TEMPLATE_WINBACK=reativacao_corte
```

(Se a WABA for sempre a **sua** com vários números, os templates são criados **uma vez**. Se cada salão tem WABA própria, repita este passo.)

### 5.1 Confirmação — Utilidade — `confirmacao_agendamento`

```text
Olá {{1}}! Seu horário em {{2}} ficou para {{3}}. Gerenciar reserva: {{4}}
```

`{{1}}` nome · `{{2}}` serviços · `{{3}}` quando · `{{4}}` link gerenciar

### 5.2 Lembrete ~24h — Utilidade — `lembrete_horario`

```text
Oi {{1}}, lembrete: você tem {{2}} em {{3}}. Gerenciar: {{4}}
```

### 5.3 Lembrete ~2h — Utilidade — `lembrete_proximo` (opcional)

```text
Oi {{1}}, seu horário está próximo: {{2}} em {{3}}. Gerenciar: {{4}}
```

### 5.4 Reativação Plus+ — Marketing — `reativacao_corte`

```text
Olá {{1}}! Faz {{2}} dias desde seu último corte em {{3}}. Que tal marcar de novo? Responda esta mensagem para agendar. Se não quiser mais avisos, responda PARE.
```

`{{1}}` primeiro nome · `{{2}}` dias · `{{3}}` nome do salão  

Espere **Aprovado**. Marketing pode demorar horas/dias.  
Reinicie o serviço Railway se alterou as envs.

---

## Passo 6 — Plus+ (só se vendeu)

1. Plano **PLUS** ativo em `/admin/plano`  
2. Template `reativacao_corte` **aprovado**  
3. Em `/admin/whatsapp`: fila **Reativação** sem aviso de template faltando  
4. Explicar ao dono:
   - ele só clica **Aprovar e enviar**  
   - cliente responde **PARE** = para de receber  

---

## Passo 7 — Encerrar a call

Envie ao dono (WhatsApp):

1. Link do painel e do site `/{slug}`  
2. “Assistente: mande oi no número do salão para testar”  
3. Se Pro: “PIX pelo Asaas já ligado”  
4. Pendências: templates ainda em análise (se houver)  
5. Canal de suporte de vocês  

Anote Phone number ID, plano e data no seu controle interno.

---

## Critérios de pronto

| Nível | Pronto quando |
|-------|----------------|
| Site | `/{slug}/agendar` funciona |
| WhatsApp site | botão abre conversa |
| Bot | `oi` → agenda e aparece no admin |
| Avisos | templates aprovados + toggles + cron ok |
| PIX/clube | Asaas + teste PIX / adesão |
| Plus+ | fila reativação envia sem erro `#132001` |

---

## Tempo típico por cliente

| Escopo | Tempo seu |
|--------|-----------|
| Site + número | 15–30 min |
| + Bot Cloud API | +30–45 min |
| + Asaas/clube | +20–30 min |
| + Templates (submeter) | +15–20 min (+ espera Meta) |
| + Plus+ | +10 min depois do Marketing aprovado |

---

## Lembrete importante

- **Caso de uso Meta (Etapa 1–2)** = número + webhook + API.  
- **Templates** = outra tela (Modelos de mensagem).  
- Bot fala **sem** template; comanda/lembrete/reativação **fora das 24h** precisam de template aprovado na WABA daquele número.

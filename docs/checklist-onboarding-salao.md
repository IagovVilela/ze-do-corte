# Checklist de onboarding — por salão (uso interno · 100% do sistema)

Imprima **uma cópia por cliente**. Use na call e no follow-up.  
Inclui: o que cadastrar no painel, links Meta/Asaas, **textos prontos dos templates** para aprovação e o que é seu vs do dono.

---

## Cabeçalho do cliente

| Campo | Valor |
|-------|--------|
| Salão (nome fantasia) | |
| Slug / URL pública | `https://barbernegon-production.up.railway.app/`________ |
| Org ID (se tiver) | |
| Plano | □ Free · □ Pro · □ Plus+ · □ Trial Pro |
| Dono — nome / WhatsApp | |
| E-mail login Barbernegon | |
| E-mail Meta / Business | |
| Número WhatsApp do salão | +55 (____) ________-________ |
| Chip já no WhatsApp app? | □ Sim · □ Não (precisa liberar para Cloud API) |
| Data call | ____/____/______ |
| Quem instalou | |
| Follow-up templates/KYC | ____/____/______ |

**Escopo desta instalação**

- [ ] Site + agenda + número `wa.me` (mínimo)
- [ ] Assistente WhatsApp (bot)
- [ ] Confirmação + lembretes (templates Utilidade)
- [ ] PIX / Asaas do salão
- [ ] Clube de assinaturas (Pro/Plus+)
- [ ] Caixa / financeiro Pro
- [ ] Reativação Plus+ (template Marketing)
- [ ] IA briefing / Inteligência (chave Gemini na plataforma)

---

## Links que você vai usar (abra e deixe logado)

| O quê | Link |
|-------|------|
| Painel do salão | `https://barbernegon-production.up.railway.app/admin` |
| WhatsApp do salão | `…/admin/whatsapp` |
| Pagamentos Asaas | `…/admin/pagamentos` |
| Plano do salão | `…/admin/plano` |
| Clube | `…/admin/clube` |
| Site / branding | `…/admin/site` (ou equivalente no menu) |
| Serviços / equipe / horários | menu Admin |
| Meta Business Suite | https://business.facebook.com/ |
| Contas do WhatsApp (Config. empresa) | Business Suite → ⚙ → **Contas** → **Contas do WhatsApp** |
| Gerenciador do WhatsApp | Na conta WABA → botão **Gerenciador do WhatsApp** |
| **Modelos de mensagem** | https://business.facebook.com/wa/manage/message-templates/ |
| Developers (app / API) | https://developers.facebook.com/apps/ |
| Asaas | https://www.asaas.com/ |
| Railway (env / cron) | https://railway.app/ (projeto **barbernegon**) |
| Webhook WhatsApp (colar na Meta) | `https://barbernegon-production.up.railway.app/api/webhooks/whatsapp` |
| Webhook Asaas (plataforma) | `https://barbernegon-production.up.railway.app/api/webhooks/asaas` |

Docs internas: [whatsapp-meta.md](./whatsapp-meta.md) · [pagamentos-asaas.md](./pagamentos-asaas.md) · [guia-whatsapp-e-pagamentos.md](./guia-whatsapp-e-pagamentos.md) · [operacao.md](./operacao.md)

---

## Mapa “100%” por plano (o que precisa estar ligado)

| Funcionalidade | Free | Pro / Trial | Plus+ | O que cadastrar / ligar |
|----------------|:----:|:-----------:|:-----:|-------------------------|
| Site público `/{slug}` + Agendar | ✓ | ✓ | ✓ | Serviços, horários, equipe, site |
| Número WhatsApp no site | ✓ | ✓ | ✓ | `/admin/whatsapp` número |
| Bot agenda / remarca / cancela | ✓* | ✓* | ✓* | Cloud API + Phone ID + token + bot ativo |
| Comanda/confirmação WhatsApp | ✓* | ✓* | ✓* | Toggle + **template** `CONFIRMATION` |
| Lembretes ~24h e ~2h | ✓* | ✓* | ✓* | Toggle + templates + **cron** plataforma |
| PIX / cartão Asaas (salão) | — | ✓ | ✓ | Conta Asaas + API key em `/admin/pagamentos` |
| Clube assinaturas | — | ✓ | ✓ | Planos em `/admin/clube` + Asaas |
| Caixa / a receber / comissões | — | ✓ | ✓ | Usar painel financeiro |
| Financeiro gerencial (DRE etc.) | — | ✓ | ✓ | Config em financeiro (se usar) |
| Fila reativação + aprovar envio | — | — | ✓ | Plano PLUS + template **Marketing** winback |
| Agente texto livre (horários 1/2/3) | — | — | ✓ | PLUS + Gemini na **plataforma** |
| Briefing / Inteligência IA | opcional | opcional | opcional | `MORNING_BRIEFING_AI_*` na Railway |

\*Com Cloud API configurada neste salão. Sem template, confirmação/lembrete só funcionam se o cliente já falou nas últimas 24h.

---

## A. Antes da call (você — 5 min)

- [ ] Slug e conta Barbernegon ok (ou criar na call)
- [ ] Combinar plano e escopo (tabela acima)
- [ ] Pedir: acesso à Meta (ou ficar na call compartilhando tela)
- [ ] Anotar número do chip e se precisa **deslogar** do app WhatsApp para migrar à Cloud API
- [ ] Confirmar cron WhatsApp na Railway (`/api/cron/whatsapp-jobs` + `CRON_SECRET`) — **uma vez na plataforma**

---

## B. Cadastros no Barbernegon (dono + você — base 100%)

### B1. Conta e operação

- [ ] Login `/admin`
- [ ] Dados do salão / unidades
- [ ] **Serviços** (nome, duração, preço) — sem isso o bot não agenda
- [ ] **Equipe** (barbeiros) + permissões
- [ ] **Horários** de funcionamento / agenda
- [ ] Foto / textos do **site** (`/admin/site`)
- [ ] Teste público: abrir `/{slug}` e `/{slug}/agendar` e criar 1 reserva teste

### B2. WhatsApp — essencial (sempre)

- [ ] `/admin/whatsapp` → número da barbearia (DDD) → Salvar  
  (atualiza botão `wa.me` do site)

### B3. Asaas (Pro / Plus+ / quem recebe PIX)

- [ ] Conta em https://www.asaas.com/
- [ ] KYC / documentos
- [ ] Conta bancária para saque
- [ ] Copiar **API Key**
- [ ] Colar em `/admin/pagamentos` + **Quero receber online** → Salvar  
  (webhook do salão é criado automaticamente)
- [ ] Teste: agendar e gerar PIX (ou cobrança teste)

### B4. Clube (Pro / Plus+)

- [ ] Criar plano(s) em `/admin/clube` (preço, ciclo, visitas)
- [ ] Conferir página pública `/{slug}/clube`
- [ ] Teste adesão (PIX) se Asaas ok

### B5. Plano SaaS Barbernegon

- [ ] `/admin/plano` — Free / Pro / Plus+ / trial conforme contrato
- [ ] Se Plus+: tier **PLUS** ativo na org (sem isso a fila de reativação fica bloqueada)

### B6. Opcionais do salão

- [ ] Metas da equipe (se usar briefing)
- [ ] Estoque / produtos (se usar)
- [ ] Financeiro gerencial — config inicial (Pro)
- [ ] Convidar admin/funcionários

---

## C. WhatsApp Cloud API (você — obrigatório para assistente)

### C1. Meta

- [ ] WABA correta (ex.: Barbernegon / Barbergon / do salão)
- [ ] Número do salão registrado e verificado
- [ ] **Phone number ID:** `________________________________`
- [ ] Token de acesso (permanente preferível) → colar só no painel (não escrever aqui)
- [ ] Webhook URL: `https://barbernegon-production.up.railway.app/api/webhooks/whatsapp`
- [ ] Verify token = `META_WEBHOOK_VERIFY_TOKEN` (Railway)
- [ ] Campo **`messages`** assinado
- [ ] Teste Meta “Enviar mensagem” / QR ok

### C2. Barbernegon `/admin/whatsapp`

- [ ] Phone number ID colado (**deve ser o mesmo** dos logs / Meta)
- [ ] Access token salvo
- [ ] Business Account ID (opcional): _______________
- [ ] □ Ligar assistente
- [ ] □ Enviar comanda ao agendar
- [ ] □ Lembretes automáticos
- [ ] **Salvar**

### C3. Teste bot (obrigatório)

- [ ] Outro celular → `oi` / `menu` no número Cloud
- [ ] Agendar (serviço → barbeiro → dia → hora → nome)
- [ ] Remarcar / cancelar (smoke)
- [ ] Reserva no painel com origem WhatsApp
- [ ] Logs Railway: **sem** “nenhum salão com Phone number ID …”

---

## D. Templates Meta — textos prontos para aprovação

Criar em: https://business.facebook.com/wa/manage/message-templates/  
Idioma: **Portuguese (BR)** · Tipo de variável: **Número** · Sem mídia (salvo se quiser).

Aguarde **Aprovado** antes de depender do envio fora das 24h. Marketing (winback) costuma demorar mais que Utilidade.

Depois de aprovado, na Railway (nomes **exatos**):

```text
META_WA_TEMPLATE_CONFIRMATION=confirmacao_agendamento
META_WA_TEMPLATE_REMINDER=lembrete_horario
META_WA_TEMPLATE_REMINDER_NEAR=lembrete_proximo
META_WA_TEMPLATE_WINBACK=reativacao_corte
```

(Ajuste os nomes se criar diferentes; o importante é bater com a Meta.)  
Redeploy / restart do serviço após alterar env: □

---

### D1. Confirmação (Utilidade) — `confirmacao_agendamento`

**Categoria:** Utilidade · **Nome:** `confirmacao_agendamento`

O sistema envia, nesta ordem:

1. `{{1}}` = nome do cliente  
2. `{{2}}` = serviços (resumo)  
3. `{{3}}` = data/hora  
4. `{{4}}` = link `/minha-reserva/...` (quando existir token)

**Corpo (cole na Meta):**

```text
Olá {{1}}! Seu horário em {{2}} ficou para {{3}}. Gerenciar reserva: {{4}}
```

**Exemplos na Meta:** João · Corte + barba · 15/09 às 14:00 · `https://barbernegon-production.up.railway.app/minha-reserva/exemplo`

| Status | □ Em análise · □ Aprovado · □ Rejeitado (motivo: ________) |
| Nome final na Meta | |
| Env Railway | `META_WA_TEMPLATE_CONFIRMATION=` |

---

### D2. Lembrete ~24h (Utilidade) — `lembrete_horario`

**Categoria:** Utilidade · **Nome:** `lembrete_horario`

Parâmetros do sistema:

1. `{{1}}` = nome  
2. `{{2}}` = nome do serviço  
3. `{{3}}` = data/hora  
4. `{{4}}` = link gerenciar (se houver)

**Corpo:**

```text
Oi {{1}}, lembrete: você tem {{2}} em {{3}}. Gerenciar: {{4}}
```

**Exemplos:** Maria · Corte · 16/09 às 10:00 · URL de exemplo

| Status | □ Em análise · □ Aprovado · □ Rejeitado |
| Nome final | |
| Env | `META_WA_TEMPLATE_REMINDER=` |

---

### D3. Lembrete ~2h (Utilidade) — `lembrete_proximo` (opcional)

Se não criar, o sistema pode reutilizar o de 24h (`META_WA_TEMPLATE_REMINDER`).

**Nome sugerido:** `lembrete_proximo`

```text
Oi {{1}}, seu horário está próximo: {{2}} em {{3}}. Gerenciar: {{4}}
```

| Status | □ Em análise · □ Aprovado · □ Não usar (só REMINDER) |
| Env | `META_WA_TEMPLATE_REMINDER_NEAR=` |

---

### D4. Reativação Plus+ (Marketing) — `reativacao_corte`

**Categoria:** Marketing · **Tipo:** Padrão · **Nome:** `reativacao_corte`

Parâmetros do sistema (`whatsapp-winback.ts`):

1. `{{1}}` = primeiro nome  
2. `{{2}}` = dias desde o último corte  
3. `{{3}}` = nome do salão  

**Corpo:**

```text
Olá {{1}}! Faz {{2}} dias desde seu último corte em {{3}}. Que tal marcar de novo? Responda esta mensagem para agendar. Se não quiser mais avisos, responda PARE.
```

**Exemplos:** João · 30 · Barbergon

| Status | □ Em análise · □ Aprovado · □ Rejeitado |
| Env | `META_WA_TEMPLATE_WINBACK=reativacao_corte` |

**Depois de aprovado (Plus+):**

- [ ] Fila `/admin/whatsapp` sem aviso laranja de template
- [ ] Teste **Aprovar e enviar** em 1 candidato (ou número de teste com opt-in)
- [ ] Explicar ao dono: só ele aprova; cliente pode **PARE**

---

## E. Plataforma (uma vez — confirme se já está)

Não é por salão, mas sem isso o “100%” quebra para todos:

- [ ] `META_WEBHOOK_VERIFY_TOKEN`
- [ ] `WHATSAPP_TOKEN_ENCRYPTION_KEY`
- [ ] `META_APP_ID` / `META_APP_SECRET`
- [ ] `META_GRAPH_VERSION` (ex. `v21.0`)
- [ ] `CRON_SECRET` + cron 15–30 min → `GET/POST /api/cron/whatsapp-jobs`
- [ ] Asaas plataforma: `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `ASAAS_TOKEN_ENCRYPTION_KEY` (billing SaaS)
- [ ] (IA) `MORNING_BRIEFING_AI_ENABLED` + `OPENAI_API_KEY` + `OPENAI_BASE_URL` + modelo
- [ ] `NEXT_PUBLIC_APP_URL` / `APP_URL` (links de comanda corretos)

---

## F. Encerramento com o dono

- [ ] Resumo no WhatsApp dele: o que já funciona + como testar (`oi`)
- [ ] Vídeos passo a passo (Asaas / uso diário), se houver
- [ ] Suporte: _______________________________
- [ ] Pendências (templates em análise / KYC): _______________________________
- [ ] Data de retorno: ____/____/______

### Tempo desta instalação

□ ≤30 min · □ 30–45 · □ 45–70 · □ +70 min

### Observações

_________________________________________________________________

_________________________________________________________________

---

## Quem faz o quê (resumo)

| Item | Dono | Você |
|------|:----:|:----:|
| Serviços, horários, equipe, site | ✓ | ajuda |
| Número no `/admin/whatsapp` | ✓ | confere |
| Conta Asaas + API key | ✓ | guia na call |
| Planos do clube | ✓ | guia |
| Meta Cloud, webhook, Phone ID, token | | ✓ |
| Criar/submeter templates (textos desta folha) | | ✓ |
| Env Railway templates / cron | | ✓ |
| Teste `oi` + agendar | junto | ✓ |
| Aprovar reativação no dia a dia | ✓ | — |

---

## Ordem sugerida na call

1. Cadastros B (site/agenda)  
2. Número WhatsApp site  
3. Cloud API C + teste `oi`  
4. Asaas B3 (se Pro)  
5. Clube B4 (se Pro)  
6. Submeter templates D (pode ficar em análise)  
7. Plus+ / winback quando Marketing aprovar  
8. Encerrar F + follow-up de templates

# Pagamentos Asaas

Dois fluxos financeiros **separados** (sem split/marketplace):

1. **SaaS Barbernegon** — conta Asaas da **plataforma** cobra Starter/Pro do dono.
2. **Salão** — cada org cola a **própria** API key Asaas; PIX de agendamento e assinaturas do clube caem na conta do salão.

## Variáveis de ambiente (plataforma)

| Variável | Uso |
|----------|-----|
| `ASAAS_API_KEY` | API key da conta Barbernegon |
| `ASAAS_WEBHOOK_TOKEN` | Token do header `asaas-access-token` no webhook |
| `ASAAS_ENV` | `sandbox` (default) ou `production` |
| `ASAAS_API_URL` | Override opcional da base `/api/v3` |
| `ASAAS_TOKEN_ENCRYPTION_KEY` | Criptografa API keys dos salões |

Webhook único:

`https://SEU_DOMINIO/api/webhooks/asaas`

No painel Asaas (plataforma **e** cada salão): Integrações → Webhooks → URL acima + o **mesmo** `ASAAS_WEBHOOK_TOKEN`. Eventos mínimos: `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`, `SUBSCRIPTION_DELETED` / inativação.

`externalReference` roteia o evento:

| Prefixo | Destino |
|---------|---------|
| `saas_org:{orgId}:{starter\|pro}` | `Organization.planStatus` / `planTier` |
| `appt:{appointmentId}` | `Appointment.paidAt` + `paymentStatus` |
| `club_sub:{subscriptionId}` | `ClientSubscription.status` |

Idempotência: tabela `PaymentEvent` (`asaasEventId` unique).

## SaaS (`/admin/plano`)

- Trial 14 dias (`planTier=TRIAL_FULL`) libera caixa + clube.
- OWNER assina Starter (R$ 79) ou Pro (R$ 129) via `POST /api/platform/billing` com `billingType`:
  - **`PIX`** (padrão) — Asaas gera fatura/QR todo mês; o dono paga cada cobrança manualmente.
  - **`CREDIT_CARD`** — abre a fatura Asaas para cadastrar o cartão uma vez; meses seguintes com débito automático.
- **O que desbloqueia de verdade**: Starter = site, agenda, painel, canvas, WhatsApp, PIX do salão, marketplace. **Pro** (ou trial ativo) = tudo isso + **Caixa** (`/admin/caixa`) + **Clube** (`/admin/clube` e APIs). Textos em `SAAS_PLANS` / `SaasPlanComparison`.
- Webhook `PAYMENT_RECEIVED` / `PAYMENT_CONFIRMED` → `planStatus=ACTIVE` + tier.
- `PAST_DUE` / trial expirado: banner + **Caixa** e **Clube** bloqueados (só Pro ativo mantém após trial).
- Starter ativo: site + agenda + admin; sem caixa/clube.
- **Cancelar plano** (só OWNER):
  - `POST /api/platform/billing/cancel` — trial/`PAST_DUE` → `CANCELLED` na hora; `ACTIVE` cancela no Asaas, grava `planCancelAt` (fim do período) e mantém Ativo até essa data.
  - Enquanto agendado: botão **Desfazer cancelamento** → `POST /api/platform/billing/undo-cancel` (recria assinatura com o mesmo `billingType` lembrado na sessão, default PIX).
  - Depois de `planCancelAt`, ao abrir `/admin/plano` (ou GET billing) o status vira `CANCELLED` e sai do marketplace (`TRIAL`/`ACTIVE` only).
  - Ops em `/plataforma` também pode forçar `CANCELLED` no editor da barbearia.

## Salão (`/admin/pagamentos`)

1. Conta Asaas do salão → API key.
2. Salvar key (+ toggle receber online). Exige `ASAAS_TOKEN_ENCRYPTION_KEY`.
3. Configurar webhook do **salão** para a mesma URL/token.

### PIX no agendamento

Após reservar no site: “Pagar agora com PIX” → `POST /api/appointments/[id]/pay-pix` (com `manageToken`). Balcão manual continua em `/admin`.

### Clube

1. Plano Pro/trial + Asaas do salão ligado em `/admin/pagamentos`.
2. Criar planos em `/admin/clube`.
3. **Cliente assina sozinho** em `/{slug}/clube` (escolhe plano, CPF, **PIX ou cartão**) — API `GET/POST /api/public/club/[slug]` com `billingType`.
4. **Balcão**: vincular em `/admin/clube` com CPF gera QR (PIX) ou link da fatura (cartão); sem CPF cadastra ativo offline.
5. Webhook `PAYMENT_RECEIVED`/`CONFIRMED` → clube **ACTIVE**, novo `currentPeriodEnd` e **`visitsUsed = 0`** (reset do ciclo).
6. Ao agendar com o mesmo telefone + serviço incluso, aplica crédito do clube (só status **ACTIVE**).
7. **Gestão no painel** (`/admin/clube`): Pausar (status `PAUSED` + Asaas `INACTIVE`), Reativar, Postergar 1–90 dias (`currentPeriodEnd` + Asaas `nextDueDate`), Cancelar (já cancelava no Asaas).
8. **Notificação ao cliente**: WhatsApp se bot ativo; e-mail se Resend + `clientEmail`. Dispara nas ações manuais e nos webhooks `PAYMENT_OVERDUE` / cancelamento Asaas.

## Migração

`prisma/migrations/20260714210000_asaas_payments` — em produção via `start:prod` (`prisma migrate deploy`).

## Fora desta fase

Split/comissão, Stripe Connect, marketplace.

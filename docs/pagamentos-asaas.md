# Pagamentos Asaas

Dois fluxos financeiros **separados** (sem split/marketplace):

1. **SaaS Barbernegon** — conta Asaas da **plataforma** cobra o **Pro** do dono (Free não gera cobrança).
2. **Salão** — cada org cola a **própria** API key Asaas; PIX de agendamento e assinaturas do clube caem na conta do salão.

## Variáveis de ambiente (plataforma)

| Variável | Uso |
|----------|-----|
| `ASAAS_API_KEY` | API key da conta Barbernegon |
| `ASAAS_WEBHOOK_TOKEN` | Token do header `asaas-access-token` no webhook |
| `ASAAS_ENV` | `sandbox` (default) ou `production` |
| `ASAAS_API_URL` | Override opcional da base `/api/v3` |
| `ASAAS_TOKEN_ENCRYPTION_KEY` | Criptografa API keys dos salões |
| `SAAS_LAUNCH_OFFER_UNTIL` | ISO date: enquanto futura, cadastro ganha **90 dias** de trial; senão **30** |

Webhook único:

`https://SEU_DOMINIO/api/webhooks/asaas`

No painel Asaas (plataforma **e** cada salão): Integrações → Webhooks → URL acima + o **mesmo** `ASAAS_WEBHOOK_TOKEN`. Eventos mínimos: `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`, `SUBSCRIPTION_DELETED` / inativação.

`externalReference` roteia o evento:

| Prefixo | Destino |
|---------|---------|
| `saas_org:{orgId}:{pro}` | `Organization.planStatus` / `planTier` (legado `starter` no ref ainda é aceito) |
| `appt:{appointmentId}` | `Appointment.paidAt` + `paymentStatus` |
| `club_sub:{subscriptionId}` | `ClientSubscription.status` |

Idempotência: tabela `PaymentEvent` (`asaasEventId` unique).

## SaaS (`/admin/plano`) — freemium

- Cadastro: trial Pro padrão **30 dias** (`planStatus=TRIAL`); se `SAAS_LAUNCH_OFFER_UNTIL` for futuro → **90 dias** (oferta de lançamento). Caixa + Clube + seats/unidades ilimitados no trial.
- Fim do trial sem pagamento → **`ACTIVE` + `FREE`** (site, agenda, Explorar; sem Caixa/Clube; **até 2 barbeiros STAFF**; **1 unidade**). Não obriga assinar.
- OWNER assina só **Pro (R$ 129)** via `POST /api/platform/billing` com `planId: "pro"` e `billingType`:
  - **`PIX`** (padrão) — fatura/QR mensal.
  - **`CREDIT_CARD`** — cartão na fatura Asaas; recorrência automática.
- **Free**: site, agenda, painel, canvas, WhatsApp, PIX do salão, marketplace, até 2 barbeiros, 1 unidade. **Pro** (ou trial): Free + Caixa + Clube + barbeiros ilimitados + várias unidades. Sem venda avulsa de seats — 3º barbeiro exige Pro. Textos em `SAAS_FREE_PLAN` / `SAAS_PLANS`.
- Gate de equipe: `FREE_STAFF_SEAT_LIMIT` / `freeTierAllowsAnotherStaffSeat` em POST/PATCH `/api/admin/staff`.
- Webhook `PAYMENT_RECEIVED` / `PAYMENT_CONFIRMED` → `planStatus=ACTIVE` + `planTier=PRO`.
- `PAST_DUE`: banner + Caixa/Clube bloqueados; após settle sem assinatura → Free.
- **Cancelar Pro** (só OWNER):
  - `POST /api/platform/billing/cancel` — trial/`PAST_DUE` → **Free** na hora; `ACTIVE` Pro agenda `planCancelAt` e no fim cai no **Free** (não “conta morta”).
  - Desfazer: `POST /api/platform/billing/undo-cancel`.
  - Marketplace lista `TRIAL` e `ACTIVE` (Free incluso).

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

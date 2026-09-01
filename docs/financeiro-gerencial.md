# Financeiro gerencial

Módulo Pro para gestão financeira avançada do salão: precificação por custo (CSV/PV), DRE, ponto de equilíbrio e fluxo de caixa analítico.

## Pré-requisitos

- Plano **Pro** ativo (`hasProFeatures`)
- Permissão `viewRevenue` (OWNER/ADMIN)

## Rotas (admin)

| Rota | Função |
|------|--------|
| `/admin/financeiro/configuracao` | Pró-labore, horas produtivas, margens, categorias fixa/variável, contas bancárias |
| `/admin/financeiro/precificacao` | CSV e preço de venda sugerido por serviço |
| `/admin/financeiro/dre` | DRE gerencial mensal |
| `/admin/financeiro/ponto-equilibrio` | Atendimentos necessários para cobrir custos fixos |
| `/admin/financeiro/fluxo-caixa` | Entradas/saídas realizadas e projetadas |

## APIs

- `GET/PUT /api/admin/finance/settings`
- `GET/PUT/POST /api/admin/finance/service-costs`
- `GET /api/admin/finance/dre?yearMonth=AAAA-MM`
- `GET /api/admin/finance/break-even?yearMonth=AAAA-MM`
- `GET /api/admin/finance/cashflow?from=&to=`
- `GET /api/admin/finance/alerts`

## Fórmulas

- **CSV** = MOD + MAT + DF (despesa fixa rateada: `fixo_mensal / horas × duração`)
- **PV** = CSV ÷ (1 − DV% − ML%)

Exemplo do workshop: MOD 153,84 + MAT 100 + DF 205,12 = CSV 458,96 → PV 655,66 (DV 10%, ML 20%).

## Modelos Prisma

- `FinanceSettings` — parâmetros por organização (incl. `autoCreateProLaboreExpense`)
- `FinanceCategory.costType` — `NONE | FIXED | VARIABLE`
- `ServiceCostProfile` — MOD/MAT por serviço
- `BankAccount` — contas bancárias
- `Product.costPrice` — custo unitário (DRE)

## Exportação

Pacote mensal XLSX (`?pack=month&yearMonth=AAAA-MM`) inclui abas **DRE** e **Fluxo de caixa**.

Export CSV da DRE: `?pack=month&yearMonth=AAAA-MM&format=csv`.

## Bibliotecas

- `src/lib/finance-settings.ts`
- `src/lib/service-costing.ts` (funções puras + testes)
- `src/lib/service-costing-admin.ts`
- `src/lib/finance-dre.ts`
- `src/lib/finance-break-even.ts`
- `src/lib/finance-cashflow.ts`
- `src/lib/finance-alerts.ts`
- `src/lib/finance-access.ts` — gate Pro nas páginas

## Alertas

Dashboard (`/admin`) e Braço Direito (`/admin/inteligencia`) exibem alertas quando:

- Serviços estão abaixo do CSV
- Ponto de equilíbrio do mês não foi atingido
- Saldo projetado pode ficar negativo

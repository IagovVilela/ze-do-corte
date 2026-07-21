# Barbernegon — texto para apresentar ao investidor

Use como one-pager, e-mail ou roteiro de fala (≈ 3–5 min). Ajuste o pedido final ao que você quiser pedir na reunião.

---

## Texto pronto (copiar e colar / ler)

**Barbernegon** é um software de assinatura (SaaS) para barbearias terem **site com a própria marca**, **agenda online** e **gestão do dia a dia** — equipe, serviços, caixa, clube de clientes e assistente no WhatsApp — sem depender de marketplace que dilui a identidade do salão.

**Slogan:** *Sua barbearia, sua cara, sem burocracia.*

### O problema

O dono de barbearia vive um triângulo difícil:

1. Quer parecer profissional na internet, mas site caro ou genérico não resolve.
2. Precisa de agenda online — WhatsApp confunde horário, gera falta e retrabalho.
3. As opções do mercado falham em algum ponto: marketplaces (estilo Booksy) colocam o salão lado a lado com concorrentes e enfraquecem a marca; softwares pesados são difíceis de usar; só Instagram não fecha o ciclo agenda → atendimento → caixa → retenção.

Resultado: tempo perdido, no-show, pouca recorrência e pouca diferenciação.

### A solução

Uma plataforma **multi-tenant**: cada barbearia tem sua “casa” digital.

- Site próprio em `barbernegon.com/nome-da-barbearia` (marca do salão, não vitrine compartilhada)
- Editor visual tipo Canva (templates, cores, seções — desktop e celular)
- Agendamento no próprio site (cliente marca sozinho; pode remarcar/cancelar)
- Painel completo: equipe, unidades, serviços, caixa e **clube de assinaturas**
- Pagamentos do salão via **Asaas** (PIX e cartão) — o dinheiro do cliente cai na conta do salão; a Barbernegon não fica com split desse valor
- **Assistente no WhatsApp** (Cloud API Meta) para agendar / remarcar / cancelar pelo chat

**Modelo de receita:** assinatura mensal da plataforma.

| Plano | Preço | Foco |
|-------|-------|------|
| Trial | 14 dias | Experiência completa (nível Pro) |
| Starter | R$ 79/mês | Site, agenda, painel, PIX, WhatsApp, marketplace |
| Pro | R$ 129/mês | Tudo do Starter + **Caixa** + **Clube** |

Cobrança do plano SaaS: PIX ou cartão, na conta Asaas da **plataforma**.  
Receita do salão com clientes (agenda PIX / clube): conta Asaas **do próprio salão**.

### Por que é um bom negócio

1. **Mercado grande e atrasado digitalmente** — milhares de barbearias no Brasil ainda operam no WhatsApp e no boca a boca.
2. **Receita recorrente (SaaS)** — mensalidade previsível + expansão multi-unidade já no produto.
3. **Alto custo de troca** — quanto mais o salão personaliza site e operação, mais difícil sair.
4. **Posicionamento claro vs marketplace** — vendemos *casa própria*, não comparação com concorrente.
5. **Upsells naturais** — domínio próprio, mais templates, marketing, multi-loja premium, onboarding WhatsApp facilitado (Embedded Signup).

### O que já está pronto

Produto em **produção**, com:

- Multi-tenant com isolamento por barbearia  
- Site editável (canvas + templates)  
- Agendamento público + gestão da reserva  
- Admin (marca, site, equipe, unidades, serviços, caixa, clube)  
- Billing SaaS Starter/Pro (Asaas)  
- PIX de agendamento e clube na conta do salão  
- Bot WhatsApp (agendar / remarcar / cancelar) em integração  
- Landing, cadastro e planos públicos  

**Próximo foco comercial:** adquirir e reter os primeiros salões pagantes (piloto), fechar onboarding WhatsApp mais simples para o dono, e validar CAC/LTV na prática.

### O que pedimos nesta conversa

Não precisa ser cheque na primeira reunião. Pedimos:

1. Feedback sincero sobre posicionamento e preço (R$ 79 / R$ 129)  
2. Introduções a **2–3 donos de barbearia** para piloto pago  
3. Se fizer sentido: aporte seed para **go-to-market** (aquisição + suporte onboarding) e acelerar os primeiros 20–50 salões  

Pergunta de fechamento: *“O que faria sentido para validar Barbernegon com 10–20 barbearias nos próximos 60 dias?”*

---

## Roteiro rápido (5 minutos)

1. **Problema** (1 min) — WhatsApp + marketplace dilui marca.  
2. **Solução** (1 min) — Site da marca + agenda + operação + clube + WhatsApp, num SaaS.  
3. **Demo** (2 min) — landing → site de um salão → agendar → `/admin/site` → clube/pagamentos.  
4. **Negócio** (1 min) — R$ 79 / R$ 129; dinheiro do cliente fica no salão; nós cobramos a plataforma.  
5. **Pedido** — intros + piloto; ou seed para GTM.

### Links da demo

| O quê | URL |
|-------|-----|
| Landing | https://barbernegon-production.up.railway.app/ |
| Planos | https://barbernegon-production.up.railway.app/planos |
| Cadastro | https://barbernegon-production.up.railway.app/cadastro |
| Painel | https://barbernegon-production.up.railway.app/admin |

---

## Respostas curtas se perguntarem

| Pergunta | Resposta |
|----------|----------|
| Vs Booksy? | Eles são marketplace; nós somos site + operação da marca do salão. |
| Como ganha dinheiro? | Assinatura mensal Starter/Pro. Não pegamos % do PIX/clube do salão. |
| Tração? | Produto em produção; validação comercial e primeiros pagantes são o próximo passo. |
| Por que agora? | Salões querem profissionalizar sem perder a marca; WhatsApp sozinho não escala agenda nem caixa. |

---

*Atualizado em 2026-07-20 — Barbernegon.*

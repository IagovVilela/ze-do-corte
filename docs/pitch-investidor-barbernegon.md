# Barbernegon — explicativo para conversa com investidor

Documento de apoio para apresentar a ideia e o produto. Linguagem direta; pode ler em voz alta ou enviar como one-pager.

---

## Em uma frase

**Barbernegon** é um software (SaaS) para barbearias terem **site com a própria marca**, **agenda online** e **gestão do dia a dia** (equipe, serviços, caixa e clube de assinaturas) — sem depender de app de marketplace que dilui a identidade do salão.

**Slogan:** *Sua barbearia, sua cara, sem burocracia.*

---

## O problema que resolvemos

O dono de barbearia hoje enfrenta um certo “triângulo de ferro”:

1. **Quer aparecer profissional na internet** — mas montar site caro, lento ou genérico.
2. **Precisa de agenda online** — WhatsApp confunde horário, gera falta e retrabalho.
3. **Ferramentas do mercado** costumam falhar em um destes pontos:
   - **Marketplaces / apps** (estilo Booksy): o cliente compara com concorrentes na mesma tela — a marca do salão perde força.
   - **Softwares pesados**: onboarding difícil, suporte lento, cancelamento confuso, cobranças pouco transparentes.
   - **Só site / só Instagram**: não fecha o ciclo agenda → atendimento → caixa → retenção.

Resultado: tempo perdido, no-show, pouca recorrência e pouca diferenciação visual.

---

## A ideia de negócio

Criamos uma **plataforma multi-tenant**: cada barbearia é um “inquilino” (organization) com:

| O que o dono ganha | Para quê |
|--------------------|----------|
| Site próprio em `barbernegon.com/nome-da-barbearia` | Presença com marca própria |
| Editor visual estilo Canva (desktop + mobile) | Identidade sem depender de designer |
| Agendamento online no próprio site | Cliente marca sozinho |
| Painel admin (equipe, unidades, serviços, caixa, clube) | Operar o negócio num só lugar |
| Cadastro em minutos | Começar sem burocracia |

**Modelo de receita (direção):** assinatura mensal da plataforma (planos Barbernegon) — o billing fino ainda está em evolução; o produto operacional já existe.

Há ainda o **Clube** (assinaturas do cliente final da barbearia): o salão pode vender planos de recorrência e cancelar de forma clara — receita previsível para o salão, não só para nós.

---

## Como o sistema funciona (passo a passo)

### 1. Cadastro do dono
- Entra em **/cadastro**, cria a conta de proprietário.
- O sistema cria automaticamente: organização + unidade + site inicial + login admin.

### 2. Identidade da marca
- Em **/admin/marca**: nome, logo, cores, slogans, redes, WhatsApp.
- Em **/admin/site**: editor visual (como Canva) — 14 templates prontos (clássico, neon, brutalista, oceano, boutique, bauhaus, rua…), seções, cores do sistema, tipografia.

### 3. Cliente final
- Acessa **`/slug-da-barbearia`** — vê o site daquela marca (não um marketplace).
- Clica em **Agendar** → escolhe serviço, profissional, data e horário.
- Recebe gestão da reserva (consultar / remarcar / cancelar com token).

### 4. Equipe e operação
- Dono/admin cadastra **unidades**, **serviços** (preço por unidade se quiser), **equipe**.
- Funcionário (STAFF) vê o que importa para ele; papéis separados (OWNER / ADMIN / STAFF).
- **Caixa**: visão financeira do que entrou.
- **Clube**: planos de assinatura para clientes da barbearia.

### 5. Isolamento (importante tecnicamente e comercialmente)
- Dados de uma barbearia **não misturam** com outra.
- Cada URL pública é daquela marca — white-label de verdade.

---

## Por que isso é interessante como negócio

1. **Mercado fragmentado e digitalmente atrasado** — muitas barbearias ainda vivem de WhatsApp e boca a boca.
2. **Recorrência (SaaS)** — assinatura mensal + expansão para filiais (multi-unidade já no produto).
3. **Defesa pela marca do cliente** — quanto mais ele personaliza o site e a operação no Barbernegon, mais alto o custo de troca.
4. **Diferencial claro vs marketplace** — vendemos *casa própria*, não vitrine compartilhada.
5. **Upsell natural** — domínio próprio, PWA, mais templates, billing, marketing, multi-loja premium.

---

## O que já está pronto (hoje)

- Plataforma multi-tenant com isolamento por organização  
- Site institucional editável (canvas + templates + paleta)  
- Agendamento público por slug  
- Admin: marca, site, equipe, unidades, serviços, caixa, clube  
- Landing da plataforma + fluxo de cadastro  
- Ambiente em produção (piloto / demonstração)

**Em evolução / próxima camada comercial:** billing completo dos planos Barbernegon, domínio próprio do salão, app nativo (fora do MVP consciente).

---

## Como mostrar na conversa (roteiro de 5 minutos)

1. **Problema** (1 min) — WhatsApp + marketplace dilui marca.  
2. **Solução** (1 min) — “Site da marca + agenda + operação num SaaS.”  
3. **Demo ao vivo** (2 min)  
   - Landing: `https://barbernegon-production.up.railway.app/`  
   - Cadastro ou um slug de teste  
   - `/admin/site` mexendo cor/template  
   - Agendar um horário  
4. **Negócio** (1 min) — Assinatura da plataforma + valor para o salão (agenda + clube).  
5. **Pergunta ao investidor** — “O que faria sentido para validar com 10–20 barbearias nos próximos 60 dias?”

---

## Perguntas que o investidor pode fazer (e respostas honestas)

| Pergunta | Direção da resposta |
|----------|---------------------|
| Qual o TAM? | Milhares de barbearias só no Brasil; começar por nicho regional / indicação. |
| Como cobra? | Assinatura SaaS (planos); cobrança end-to-end em fechamento. |
| Vs Booksy? | Eles são marketplace; nós somos site + operação da marca. |
| Tração? | Produto construído e em produção; validação comercial é o próximo passo. |
| Captable / go-to-market? | Indicação, parceria com fornecedores do setor, conteúdo Instagram/TikTok para donos. |

---

## Pedido sugerido na conversa (ajuste ao que você quiser)

Não precisa pedir cheque na primeira reunião. Pode pedir:

- Feedback sincero sobre o posicionamento  
- Introduções a 2–3 donos de barbearia para piloto pago  
- Ou, se fizer sentido: aporte seed para GTM + billing + primeiros clientes

---

## Links úteis na demo

| O quê | Onde |
|-------|------|
| Landing | `/` no domínio de produção |
| Cadastro | `/cadastro` |
| Planos (visão) | `/planos` |
| Site de um tenant | `/{slug}` |
| Agendar | `/{slug}/agendar` |
| Painel | `/admin` |

---

*Documento interno de apresentação — Barbernegon. Atualizar números de pricing e tração quando forem definidos.*

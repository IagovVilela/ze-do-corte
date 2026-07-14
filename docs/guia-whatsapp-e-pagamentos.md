# Guia: WhatsApp e Pagamentos (para o dono da barbearia)

Linguagem simples. Sem precisar ser técnico.

---

## Pagamentos — como o dinheiro chega no **seu banco**

### Em 3 ideias

1. O cliente paga PIX **no site** (ou a assinatura do Clube).
2. O valor cai na **sua conta Asaas** (conta digital da barbearia).
3. No Asaas, você cadastra **sua conta bancária** e faz o saque / transferência para o banco de sempre.

A Barbernegon **não fica** com esse dinheiro e **não** usa a chave PIX do seu banco direto — porque o site precisa gerar um PIX novo para cada cliente e saber automaticamente quando pagou. O Asaas faz isso; o banco pessoal não.

### O que o dono faz na tela `/admin/pagamentos`

1. Criar conta grátis em [asaas.com](https://www.asaas.com/) com CPF/CNPJ da barbearia.  
2. No Asaas, cadastrar a **conta bancária** onde quer receber.  
3. Copiar o **código de conexão** (Integrações → API Key — parece senha longa `$aact_…`).  
4. Colar na Barbernegon, marcar **Quero receber online** e salvar.  

Ao salvar, o sistema **liga sozinho** o aviso de pagamento confirmado. Não precisa configurar webhook.

### Depois de ligado

- No agendamento do site: cliente pode **pagar com PIX**.  
- No Clube (plano Pro/trial): assinatura do cliente também pode ser cobrada pelo Asaas.  

---

## WhatsApp — número no site e assistente

### O essencial (quase todo mundo)

Na tela `/admin/whatsapp`:

1. Digite o **número de WhatsApp da barbearia** (com DDD).  
2. Salve.  

Isso atualiza o botão de WhatsApp do site (link `wa.me`).

### Assistente que agenda sozinho (opcional)

É um robô que responde no WhatsApp e marca horário.  
**Não basta** só o número do celular: a Meta (WhatsApp Business oficial) exige códigos especiais.

Na mesma tela, abra **“Quero ligar o assistente…”** só se o suporte Barbernegon (ou alguém que cuide da conta Meta) já tiver esses códigos:

- Código do número (Phone number ID)  
- Senha de acesso (Access token)  

Se não tiver, use só o número. O assistente pode ser ligado depois com ajuda.

---

## Checklist rápido do dono

**Pagamentos**

- [ ] Conta Asaas criada  
- [ ] Conta bancária cadastrada no Asaas  
- [ ] Código colado em `/admin/pagamentos`  
- [ ] “Quero receber online” marcado  
- [ ] Teste: agendar e gerar PIX  

**WhatsApp**

- [ ] Número da barbearia salvo em `/admin/whatsapp`  
- [ ] (Opcional) Assistente ligado com ajuda do suporte  

---

## Notas para quem cuida da plataforma (Railway)

Uma vez só — o dono do salão **não** precisa ver isso:

| Variável | Para quê |
|----------|----------|
| `NEXT_PUBLIC_APP_URL` ou `APP_URL` | URL pública (ex.: `https://barbernegon-production.up.railway.app`) — usada ao criar o webhook Asaas automático |
| `ASAAS_TOKEN_ENCRYPTION_KEY` | Guardar o código do salão com segurança |
| `ASAAS_WEBHOOK_TOKEN` | Token dos avisos Asaas |
| `ASAAS_API_KEY` | Conta Asaas **da Barbernegon** (plano Starter/Pro) |
| `WHATSAPP_TOKEN_ENCRYPTION_KEY` + `META_*` | Assistente WhatsApp na plataforma |

Detalhes técnicos: [pagamentos-asaas.md](./pagamentos-asaas.md) · [whatsapp-meta.md](./whatsapp-meta.md).

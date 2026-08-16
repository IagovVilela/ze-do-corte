# Documentação do projeto — Zé do Corte

Índice das referências em Markdown. Use a pesquisa do editor ou `grep`/ripgrep nesta pasta para localizar tópicos.

| Documento | Conteúdo |
|-----------|----------|
| [arquitetura.md](./arquitetura.md) | Stack, fluxos (público, agendamento, admin), autenticação, dados |
| [modulos-e-arquivos.md](./modulos-e-arquivos.md) | Mapa de pastas, arquivos-chave e responsabilidades |
| [operacao.md](./operacao.md) | Como subir o projeto, variáveis de ambiente, scripts e `INICIAR_ZE_DO_CORTE.bat` |
| [railway.md](./railway.md) | Deploy na Railway (Postgres, variáveis, migrações, seed) |
| [historico-de-mudancas.md](./historico-de-mudancas.md) | Registro cronológico de alterações relevantes (atualizar ao mudar comportamento) |
| [admin-hierarquia.md](./admin-hierarquia.md) | Papéis do painel (proprietário, admin, funcionário), permissões e unidades |
| [configurar-admin.md](./configurar-admin.md) | Passo a passo: BD, seed do proprietário, login `/admin/login`, equipe, troubleshooting |
| [barbernegon.md](./barbernegon.md) | Multi-tenant, `siteJson`, rotas `/{slug}`, roadmap Barbernegon |
| [pitch-investidor-barbernegon.md](./pitch-investidor-barbernegon.md) | Explicativo / one-pager para conversa com investidor |
| [whatsapp-meta.md](./whatsapp-meta.md) | WhatsApp Cloud API: webhook, tokens, bot, templates, lembretes |
| [pagamentos-asaas.md](./pagamentos-asaas.md) | Asaas: SaaS Free + Pro, PIX do salão, clube, webhooks |
| [guia-whatsapp-e-pagamentos.md](./guia-whatsapp-e-pagamentos.md) | Passo a passo prático: configurar WhatsApp + Asaas (plataforma e salão) |
| [informativo-pagamentos-asaas.pdf](./informativo-pagamentos-asaas.pdf) | Fonte interna do PDF Asaas (cópia pública em `/informativos/pagamentos-asaas.pdf`) |
| [informativo-whatsapp-plus.pdf](./informativo-whatsapp-plus.pdf) | Fonte interna do PDF Plus+ (cópia pública em `/informativos/whatsapp-plus.pdf`) |
| [suporte.md](./suporte.md) | Central de ajuda, chamados e contato (`/admin/suporte` + inbox Ops) |
| [plano-paridade-cash-barber.md](./plano-paridade-cash-barber.md) | Backlog de features vs Cash Barber (fases) |
| [observabilidade-saas.md](./observabilidade-saas.md) | Tier list S/A/B: Sentry, PostHog, uptime, logs, e2e, Dependabot |
| [como-documentar.md](./como-documentar.md) | Regras para manter esta documentação alinhada ao código |
| [stitch-design-system.md](./stitch-design-system.md) | Design system Barbernegon (Electric Blue) no formato Google Stitch `DESIGN.md` |

O [README.md](../README.md) na raiz permanece o **guia rápido** de instalação e deploy.

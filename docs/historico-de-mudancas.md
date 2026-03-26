# Histórico de mudanças (documentação)

Registo **manual** de alterações relevantes ao comportamento, APIs ou operação do projeto. Não substitui o Git log; serve para leitura rápida em Markdown.

Instruções: ao concluir uma funcionalidade ou refactor que mude contratos (API, env, fluxo de utilizador), adicione uma entrada **no topo** com data (ISO) e bullets concisos.

---

## 2026-03-26

- **Hero**: painel lateral `HeroStudioPanel` — tipografia editorial (HOJE / no estúdio), inclinação 3D ao rato, spotlight âmbar com `useMotionTemplate`, anel cónico animado, filas com hover/focus, link Reservar com micro-interação; respeita `prefers-reduced-motion`.
- **Localização**: endereço real em `BARBER_SHOP_ADDRESS` (`src/lib/constants.ts`) — R. Laurent Martins, 209, Jardim Esplanada, São José dos Campos - SP; mapa e contacto na home usam a mesma constante.
- **Marca**: logo da barbearia em `public/images/logo.jpeg`; componente `BrandLogo` na navbar e rodapé; `metadata.icons` no layout.
- **Clerk opcional em desenvolvimento**: sem `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` válida (`pk_...`), a app não usa `ClerkProvider`; middleware não chama Clerk; navbar e `/admin` funcionam em modo local (banner de aviso no admin); APIs admin aceitam pedidos só em `NODE_ENV=development`. Produção sem chave: admin API retorna 503, layout admin redireciona. Ver `src/lib/clerk-config.ts`.
- **Docker + Postgres local**: `docker-compose.yml` (Postgres 16, user `postgres`, password `ze_docorte_dev`, base `ze_do_corte`); `scripts/preparar-postgres.ps1` e `PREPARAR_BASE.bat` para subir o container, atualizar `DATABASE_URL` no `.env`, `prisma db push` e seed.
- **Prisma seed**: `seed` configurado em `prisma.config.ts` (`migrations.seed`); `prisma/seed.ts` usa `@prisma/adapter-pg` como a app (`PrismaClient` exige adapter na v7).
- **Resiliência BD**: `src/lib/data.ts` captura falhas de ligação (ex.: `ECONNREFUSED`, códigos Prisma **P1001** / **P1017**, `PrismaClientInitializationError`) e devolve lista vazia em `getServices()` em vez de derrubar a página; `ensureSeedServices` ignora o mesmo caso. Home e `/agendar` mostram `DatabaseUnavailableNotice` quando não há serviços.
- **Documentação**: [operacao.md](./operacao.md) — secção de resolução do erro Prisma **P1001** (Postgres não acessível em `localhost:5432`); `INICIAR_ZE_DO_CORTE.bat` mostra dicas resumidas quando `db push` falha.

---

## 2026-03-25

- **Documentação**: pasta `docs/` com índice, [arquitetura](./arquitetura.md), [módulos e ficheiros](./modulos-e-arquivos.md), [operação](./operacao.md), [como documentar](./como-documentar.md) e este histórico; `README.md` na raiz e `AGENTS.md` referenciam a manutenção dos `.md`.
- **Autenticação admin**: integração **Clerk**; `src/middleware.ts` protege `/admin`; `src/app/admin/layout.tsx` + `src/lib/admin-auth.ts` com lista `ADMIN_EMAILS`; APIs `GET /api/admin/dashboard` e `GET /api/admin/export` exigem sessão e e-mail autorizado.
- **Painel admin**: métricas e gráfico passam a usar `src/lib/admin-dashboard.ts` (últimos 7 dias corretos); tabela com paginação `?page=`; botão de exportação Excel na UI.
- **UX/UI**: fonte display (Bebas Neue), ajustes no Hero (scroll), `AnimatedSection`, formulário de agendamento, mapa na secção de contacto.
- **Windows**: adicionado `INICIAR_ZE_DO_CORTE.bat` para arranque com Node/Prisma/`npm run dev`.

---

_(Adicione novas entradas acima desta linha.)_

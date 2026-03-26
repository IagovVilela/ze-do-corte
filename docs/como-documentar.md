# Como manter a documentação atualizada

Objetivo: qualquer pessoa (ou agente de IA) conseguir o **estado atual** do projeto pesquisando ficheiros `.md`, principalmente em [`docs/`](./).

## O que atualizar e quando

| Situação | Onde documentar |
|----------|------------------|
| Nova rota página ou API | [modulos-e-arquivos.md](./modulos-e-arquivos.md) + linha em [historico-de-mudancas.md](./historico-de-mudancas.md) |
| Mudança de fluxo (auth, agendamento, admin) | [arquitetura.md](./arquitetura.md) + histórico |
| Nova variável de ambiente ou script | [.env.example](../.env.example), [README.md](../README.md) se for essencial, [operacao.md](./operacao.md) |
| Novo script de arranque / deploy | [operacao.md](./operacao.md) + README se for o caminho principal |
| Refactor grande de pastas | [modulos-e-arquivos.md](./modulos-e-arquivos.md) + histórico |

## Regras breves

1. **Uma fonte detalhada** para arquitetura: `docs/arquitetura.md` — evite duplicar parágrafos longos no README; no README mantenha só resumo e ligação a `docs/`.
2. **Histórico** — entrada curta com data; foco no que mudou para o utilizador ou integrador.
3. **Nomes de ficheiros** — usar caminhos relativos ao repositório (ex.: `src/lib/admin-auth.ts`).
4. **Língua** — Português, alinhado ao resto do projeto; termos técnicos em inglês quando for padrão da indústria (API, middleware).

## Para agentes (Cursor / Claude)

- Após alterações funcionais, **atualizar ou criar** secção nos `.md` indicados acima no mesmo PR/commit sempre que possível.
- Consultar [`AGENTS.md`](../AGENTS.md) para regras específicas do Next.js deste repositório.

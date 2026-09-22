# Vaga Perdida PDF v2 — Entregáveis 1 e 4 (confirmação)

## 1) Lista de screenshots (produção — `admin@barbernegon.app`)

Fonte: `https://barbernegon-production.up.railway.app` · tenant público `/ze-do-corte`.

| ID | Seção | O que mostra | Arquivo | Status |
|----|--------|----------------|----------|--------|
| S01 | 4 — Diagnóstico | Dashboard / ritual do dia | `screenshots/S01-dashboard.png` | OK produção |
| S02 | 5.1 Confirmação | Grade de agendamentos (ocupação) | `S02-admin-reservas.png` | OK `/admin/agendamentos` |
| S03 | 5.2 Canal único | Agenda online | `S03-agendar.png` | OK |
| S04 | 5.3 Reposição | Operacional do dia | `S04-admin-dia.png` | OK `/admin/operacional` |
| S05 | 5.4 Marketplace | Site white-label | `S05-site-home.png` | OK |
| S06 | 5.5 Sem cara | Seções do site | `S06-site-servicos.png` | OK |
| S07 | 6 Passo D | Formulário agendar | `S07-agendar-form.png` | OK |
| S08 | 10 Tour | Dashboard | `S08-dashboard.png` | = S01 |
| S09 | 10 Tour | Grade agendamentos | `S09-admin-lista.png` | OK |
| S10 | 10 Tour | Site white-label | = S05 / S12 | OK |
| S11 | 10 Tour | Identidade (Marca) | `S11-caixa.png` (= `S11c-marca.png`) | OK — **Caixa/Clube redirecionam para `/admin/plano` (PAST_DUE)**; tour usa Marca |
| S11b | — | Plano (gate Pro) | `S11b-clube.png` | Capturado em `/admin/plano` |
| S12 | 10 Prova social | Piloto | `S12-piloto.png` | OK |

**Recaptura:** `CAPTURE_PASSWORD=… node scripts/capture-vaga-perdida-shots.cjs`  
**PDF:** `python3 scripts/build-vaga-perdida-pdf-v2.py` → `docs/infoprodutos/vaga-perdida-barbernegon-v2.pdf` (19 páginas).

---

## 4) Fórmula de cálculo de perda (seção 4) — adotada no PDF v2

### Definições (semana escolhida)
- **A** = horários abertos no expediente
- **T** = atendimentos realizados
- **N** = no-shows
- **C** = cancelamentos sem reposição
- **Ticket** = preço do serviço mais vendido

### Fórmula oficial no guia
\[
\text{Vagas perdidas} = A - T
\]
\[
\text{R\$ deixado na mesa} = (A - T) \times \text{Ticket}
\]

### Opcional (nota)
\[
\text{Vagas recuperáveis} \approx N + C + \text{buracos ociosos}
\]

**Ticket no PDF:** preço do serviço mais vendido (comunicação simples para o dono).

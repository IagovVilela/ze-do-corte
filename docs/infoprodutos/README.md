# Vaga Perdida — entregáveis do produto

## Ideia (resumo)
Não vender “um PDF”. Vender uma **ferramenta** que o dono usa: calcular perda, marcar vazadouros, copiar scripts, cumprir 7 dias.

Detalhe do modelo: [modelo-produto-vaga-perdida.md](./modelo-produto-vaga-perdida.md)

## O que existe agora

| Entrega | Onde | Papel |
|---------|------|--------|
| **Produto interativo (principal)** | `/produtos/vaga-perdida` | Calculadora + gráfico, vazadouros, scripts, checklist (salva no aparelho) |
| **Workbook PDF** | `vaga-perdida-workbook.pdf` | Versão para imprimir / preencher à mão |
| **PDF v2 leitura** | `vaga-perdida-barbernegon-v2.pdf` | Guia diagramado com prints (legado da v2 textual) |
| **Prints** | `screenshots/` + `public/infoprodutos/vaga-perdida/` | Evidência real de produção |

## Scripts
- `CAPTURE_PASSWORD=… node scripts/capture-vaga-perdida-shots.cjs`
- `python3 scripts/build-vaga-perdida-workbook.py`
- `python3 scripts/build-vaga-perdida-pdf-v2.py`

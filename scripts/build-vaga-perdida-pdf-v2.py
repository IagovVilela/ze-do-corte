#!/usr/bin/env python3
"""Gera o PDF v2 do infoproduto Vaga Perdida (Barbernegon)."""

from __future__ import annotations

import os
from pathlib import Path

from PIL import Image as PILImage
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path("/workspace")
SHOTS = ROOT / "docs/infoprodutos/screenshots"
OUT = ROOT / "docs/infoprodutos/vaga-perdida-barbernegon-v2.pdf"
OUT_ROOT = ROOT / "vaga-perdida-barbernegon-v2.pdf"
ARTIFACT = Path("/opt/cursor/artifacts/infoprodutos/vaga-perdida-barbernegon-v2.pdf")

# Paleta Barbernegon
BG = (0x0A / 255, 0x0E / 255, 0x13 / 255)
BG2 = (0x0F / 255, 0x14 / 255, 0x19 / 255)
FG = (0xE2 / 255, 0xEA / 255, 0xF4 / 255)
MUTED = (0xA8 / 255, 0xB6 / 255, 0xC9 / 255)
ACCENT = (0x3B / 255, 0x82 / 255, 0xF6 / 255)
ACCENT_SOFT = (0x8E / 255, 0xB6 / 255, 0xFF / 255)
LINE = (0x1E / 255, 0x2A / 255, 0x3A / 255)

W, H = A4
MARGIN = 18 * mm


def register_fonts() -> tuple[str, str, str]:
    candidates = [
        (
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ),
        (
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        ),
    ]
    for reg, bold, mono in candidates:
        if Path(reg).exists() and Path(bold).exists():
            pdfmetrics.registerFont(TTFont("BNSans", reg))
            pdfmetrics.registerFont(TTFont("BNSans-Bold", bold))
            pdfmetrics.registerFont(TTFont("BNMono", mono))
            return "BNSans", "BNSans-Bold", "BNMono"
    return "Helvetica", "Helvetica-Bold", "Courier"


FONT, FONT_B, FONT_M = register_fonts()


def paint_bg(c: canvas.Canvas, variant: int = 0) -> None:
    c.setFillColorRGB(*BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    # atmosfera: faixa diagonal suave
    c.setFillColorRGB(*(BG2 if variant == 0 else (0x12 / 255, 0x1A / 255, 0x24 / 255)))
    p = c.beginPath()
    p.moveTo(0, H)
    p.lineTo(W * 0.55, H)
    p.lineTo(0, H * 0.45)
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    # acento fino no topo
    c.setFillColorRGB(*ACCENT)
    c.rect(0, H - 3.2 * mm, W, 3.2 * mm, fill=1, stroke=0)


def text_color(c: canvas.Canvas, rgb) -> None:
    c.setFillColorRGB(*rgb)


def draw_wrapped(
    c: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    max_width: float,
    font: str,
    size: float,
    leading: float,
    color=FG,
    align: str = "left",
) -> float:
    text_color(c, color)
    c.setFont(font, size)
    words = text.split()
    lines: list[str] = []
    cur = ""
    for w in words:
        trial = (cur + " " + w).strip()
        if c.stringWidth(trial, font, size) <= max_width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    for line in lines:
        if align == "center":
            c.drawCentredString(x + max_width / 2, y, line)
        else:
            c.drawString(x, y, line)
        y -= leading
    return y


def section_label(c: canvas.Canvas, label: str, y: float) -> float:
    text_color(c, ACCENT_SOFT)
    c.setFont(FONT_B, 9)
    c.drawString(MARGIN, y, label.upper())
    return y - 8 * mm


def heading(c: canvas.Canvas, title: str, y: float, size: float = 22) -> float:
    return draw_wrapped(c, title, MARGIN, y, W - 2 * MARGIN, FONT_B, size, size + 4, FG)


def body(c: canvas.Canvas, text: str, y: float, size: float = 11) -> float:
    return draw_wrapped(
        c, text, MARGIN, y, W - 2 * MARGIN, FONT, size, size + 5, MUTED
    )


def bullet(c: canvas.Canvas, text: str, y: float) -> float:
    text_color(c, ACCENT)
    c.setFont(FONT_B, 11)
    c.drawString(MARGIN, y, "•")
    return draw_wrapped(
        c, text, MARGIN + 6 * mm, y, W - 2 * MARGIN - 6 * mm, FONT, 11, 15, MUTED
    )


def framed_shot(
    c: canvas.Canvas,
    path: Path,
    y_top: float,
    caption: str,
    max_h: float | None = None,
) -> float:
    """Desenha print em moldura; retorna y abaixo da legenda."""
    if not path.exists():
        text_color(c, MUTED)
        c.setFont(FONT, 10)
        c.drawString(MARGIN, y_top - 10, f"[print ausente: {path.name}]")
        return y_top - 18 * mm

    img = PILImage.open(path)
    iw, ih = img.size
    max_w = W - 2 * MARGIN
    if max_h is None:
        max_h = 95 * mm
    scale = min(max_w / iw, max_h / ih)
    dw, dh = iw * scale, ih * scale

    x = MARGIN + (max_w - dw) / 2
    y = y_top - dh - 4 * mm

    # moldura
    pad = 2.2 * mm
    c.setFillColorRGB(*LINE)
    c.roundRect(x - pad, y - pad, dw + 2 * pad, dh + 2 * pad, 3, fill=1, stroke=0)
    c.setStrokeColorRGB(*ACCENT)
    c.setLineWidth(0.8)
    c.roundRect(x - pad, y - pad, dw + 2 * pad, dh + 2 * pad, 3, fill=0, stroke=1)

    c.drawImage(
        ImageReader(path),
        x,
        y,
        width=dw,
        height=dh,
        preserveAspectRatio=True,
        mask="auto",
    )

    cap_y = y - 5 * mm
    return draw_wrapped(
        c, caption, MARGIN, cap_y, W - 2 * MARGIN, FONT, 9, 12, MUTED, "center"
    )


def footer(c: canvas.Canvas, page: int, total: int) -> None:
    text_color(c, MUTED)
    c.setFont(FONT, 8)
    c.drawString(MARGIN, 10 * mm, "Barbernegon · Vaga Perdida")
    c.drawRightString(W - MARGIN, 10 * mm, f"{page} / {total}")


def new_page(c: canvas.Canvas, pages: list, variant: int = 0) -> float:
    if pages:
        c.showPage()
    pages.append(1)
    paint_bg(c, variant=variant % 2)
    return H - 18 * mm


def build() -> Path:
    c = canvas.Canvas(str(OUT), pagesize=A4)
    pages: list[int] = []
    # coletamos páginas e preencharemos footers numa 2ª passada via form XObject?
    # ReportLab: geramos sequencialmente e contamos; footer com total estimado.
    # Estimativa: ~16 páginas. Atualizamos no final com page count real.
    # Simpler: desenhar footer sem total e depois não — usamos contagem dinâmica.
    page_bufs: list = []  # unused; just track

    # —— 1 CAPA ——
    y = new_page(c, pages, 0)
    text_color(c, ACCENT_SOFT)
    c.setFont(FONT_B, 10)
    c.drawString(MARGIN, y, "INFOPRODUTO BARBERNEGON · R$ 19,90")
    y -= 28 * mm
    text_color(c, FG)
    c.setFont(FONT_B, 36)
    c.drawString(MARGIN, y, "Vaga Perdida")
    y -= 16 * mm
    y = draw_wrapped(
        c,
        "Como parar de deixar dinheiro na mesa na agenda da sua barbearia — e colocar a marcação sob o controle da sua marca.",
        MARGIN,
        y,
        W - 2 * MARGIN,
        FONT,
        13,
        18,
        MUTED,
    )
    y -= 10 * mm
    c.setFillColorRGB(*ACCENT)
    c.rect(MARGIN, y, 28 * mm, 1.2 * mm, fill=1, stroke=0)
    y -= 14 * mm
    y = draw_wrapped(
        c,
        "Guia prático para dono de barbearia · 7 dias para calcular o estrago, fechar vazamentos e rodar com presença própria.",
        MARGIN,
        y,
        W - 2 * MARGIN,
        FONT,
        11,
        15,
        MUTED,
    )
    text_color(c, MUTED)
    c.setFont(FONT, 9)
    c.drawString(MARGIN, 18 * mm, "Sua barbearia, sua cara — sem burocracia.")

    # —— 2 PARA QUEM ——
    y = new_page(c, pages, 1)
    y = section_label(c, "Abertura", y)
    y = heading(c, "Para quem é este guia", y)
    y -= 4 * mm
    y = body(
        c,
        "Dono de barbearia com 1 unidade e poucos barbeiros, que sente a agenda “andando no WhatsApp”, mas no fim da semana ainda sobra cadeira vazia.",
        y,
    )
    y -= 6 * mm
    y = body(
        c,
        "Você não precisa virar gestor de planilha. Precisa de um jeito simples de: ver onde a vaga some; confirmar cliente sem drama; remarcar rápido; fazer o cliente marcar na sua marca — não só no chat ou no marketplace.",
        y,
    )
    y -= 8 * mm
    y = heading(c, "Promessa", y, 16)
    y -= 3 * mm
    y = body(
        c,
        "Em 7 dias você calcula o estrago, fecha os vazamentos principais e deixa a agenda rodando com presença própria (site + marcação online).",
        y,
        12,
    )

    # —— 3 O QUE É ——
    y = new_page(c, pages, 0)
    y = section_label(c, "Conceito", y)
    y = heading(c, "O que é uma “vaga perdida”", y)
    y -= 4 * mm
    y = body(
        c,
        "Vaga perdida é qualquer horário que poderia ter gerado atendimento e não gerou — mesmo com gente pedindo horário no dia a dia.",
        y,
    )
    y -= 6 * mm
    for item in [
        "No-show — confirmou e não apareceu.",
        "Horário morto — buraco no meio do dia que ninguém preenche.",
        "Só WhatsApp — marcação solta, demora, confusão, cliente desiste.",
        "Marketplace — a vaga existe, mas o cliente compara você com o concorrente ao lado.",
        "Experiência sem cara — sem site/agenda própria, o compromisso com a sua marca fica fraco.",
    ]:
        y = bullet(c, item, y)
        y -= 2 * mm
    y -= 4 * mm
    y = body(
        c,
        "Regra de ouro: se a cadeira ficou vazia e havia alguém que poderia ocupar, não foi “dia fraco”. Foi vazão de operação.",
        y,
        12,
    )

    # —— 4 DIAGNÓSTICO + S01 ——
    y = new_page(c, pages, 1)
    y = section_label(c, "Diagnóstico · 15 minutos", y)
    y = heading(c, "Calcule o estrago", y)
    y -= 3 * mm
    y = body(
        c,
        "Pegue a última semana: A = horários abertos · T = atendidos · Ticket = preço do serviço mais vendido.",
        y,
    )
    y -= 5 * mm
    text_color(c, FG)
    c.setFont(FONT_B, 14)
    c.drawString(MARGIN, y, "Vagas perdidas = A − T")
    y -= 7 * mm
    c.drawString(MARGIN, y, "R$ na mesa = (A − T) × Ticket")
    y -= 8 * mm
    y = body(
        c,
        "Exemplo: A = 40 · T = 31 · Ticket = R$ 75 → 9 vagas · R$ 675 deixados na semana.",
        y,
    )
    y -= 4 * mm
    y = framed_shot(
        c,
        SHOTS / "S01-dashboard.png",
        y,
        "Painel real (produção) — visão da operação com prioridades do dia.",
        max_h=88 * mm,
    )

    # —— 5.1 + S02 ——
    y = new_page(c, pages, 0)
    y = section_label(c, "Vazadouro 1 de 5", y)
    y = heading(c, "Confirmação fraca", y)
    y -= 3 * mm
    y = body(
        c,
        "Sem lembrete claro, o cliente esquece. Sem regra simples, o no-show vira “normal”.",
        y,
    )
    y -= 4 * mm
    y = body(
        c,
        "No Barbernegon o agendamento fica registrado no painel — base para confirmar e acompanhar, em vez de depender da memória do chat.",
        y,
    )
    y -= 4 * mm
    y = framed_shot(
        c,
        SHOTS / "S02-admin-reservas.png",
        y,
        "Grade de agendamentos (produção): frequência e buracos por horário — onde a vaga some.",
        max_h=100 * mm,
    )

    # —— 5.2 + S03 ——
    y = new_page(c, pages, 1)
    y = section_label(c, "Vazadouro 2 de 5", y)
    y = heading(c, "Canal único (só WhatsApp)", y)
    y -= 3 * mm
    y = body(
        c,
        "Você vira secretária 24h. Demora = cliente marca em outro lugar. No Barbernegon o cliente marca sozinho na agenda online da sua barbearia.",
        y,
    )
    y -= 4 * mm
    y = framed_shot(
        c,
        SHOTS / "S03-agendar.png",
        y,
        "Agenda online do tenant piloto — serviço, horário e resumo sem depender da sua resposta imediata.",
        max_h=105 * mm,
    )

    # —— 5.3 + S04 ——
    y = new_page(c, pages, 0)
    y = section_label(c, "Vazadouro 3 de 5", y)
    y = heading(c, "Sem reposição rápida", y)
    y -= 3 * mm
    y = body(
        c,
        "Cancelou de manhã e a vaga morreu até o fim do turno. No painel operacional você enxerga o que precisa de atenção agora e remarca com rapidez.",
        y,
    )
    y -= 4 * mm
    y = framed_shot(
        c,
        SHOTS / "S04-admin-dia.png",
        y,
        "Operacional (produção): filas curtas, a receber e agenda do dia — buracos visíveis para encaixe.",
        max_h=105 * mm,
    )

    # —— 5.4 + S05 ——
    y = new_page(c, pages, 1)
    y = section_label(c, "Vazadouro 4 de 5", y)
    y = heading(c, "Dependência de marketplace", y)
    y -= 3 * mm
    y = body(
        c,
        "Você aluga atenção. O hábito do cliente fica com a plataforma, não com a sua marca. No Barbernegon o site é white-label na sua URL.",
        y,
    )
    y -= 4 * mm
    y = framed_shot(
        c,
        SHOTS / "S05-site-home.png",
        y,
        "Site do piloto /ze-do-corte — presença própria, não um app genérico.",
        max_h=105 * mm,
    )

    # —— 5.5 + S06 ——
    y = new_page(c, pages, 0)
    y = section_label(c, "Vazadouro 5 de 5", y)
    y = heading(c, "Experiência digital sem cara", y)
    y -= 3 * mm
    y = body(
        c,
        "Sem cara digital, a barbearia parece “mais uma”. Menos compromisso, mais falta. A página pública carrega a identidade da casa.",
        y,
    )
    y -= 4 * mm
    y = framed_shot(
        c,
        SHOTS / "S06-site-servicos.png",
        y,
        "Seções do site white-label — editor do painel vira a cara do salão no celular do cliente.",
        max_h=105 * mm,
    )

    # —— 6 MÉTODO ——
    y = new_page(c, pages, 1)
    y = section_label(c, "Método", y)
    y = heading(c, "Vaga Perdida em 4 passos", y)
    y -= 4 * mm
    blocks = [
        (
            "A — Padronize a oferta",
            "Publique só o expediente real. Bloqueie almoço e folgas. Separe serviços longos dos curtos. Reserve 1–2 janelas/dia para encaixe.",
        ),
        (
            "B — Confirmação em 2 toques",
            "Todo horário precisa de confirmação + lembrete na véspera. Script: “Fala, [Nome]! Seu horário na [Barbearia] está marcado para [dia] às [hora]. Responde 1 para confirmar ou 2 para remarcar.”",
        ),
        (
            "C — Reposição imediata",
            "Lista curta de 10–20 clientes flexíveis. Cancelou → dispara: “Abriu vaga hoje às [hora] para [serviço]. Quer encaixar? Responde AGORA.”",
        ),
        (
            "D — Tire a agenda da conversa solta",
            "WhatsApp é relacionamento. Marcação precisa de fluxo próprio: site da sua marca + agenda online.",
        ),
    ]
    for title, txt in blocks:
        text_color(c, ACCENT_SOFT)
        c.setFont(FONT_B, 12)
        c.drawString(MARGIN, y, title)
        y -= 5 * mm
        y = body(c, txt, y, 10)
        y -= 5 * mm

    # —— 6 + S07 ——
    y = new_page(c, pages, 0)
    y = section_label(c, "Passo D · prova", y)
    y = heading(c, "O cliente marca no navegador", y)
    y -= 3 * mm
    y = body(
        c,
        "Você opera o painel — não o bate-papo o dia inteiro.",
        y,
    )
    y -= 4 * mm
    y = framed_shot(
        c,
        SHOTS / "S07-agendar-form.png",
        y,
        "Formulário de agendamento online (produção) — fluxo próprio fora do chat solto.",
        max_h=110 * mm,
    )

    # —— 7 POLÍTICA ——
    y = new_page(c, pages, 1)
    y = section_label(c, "Regra da casa", y)
    y = heading(c, "Política simples anti no-show", y)
    y -= 4 * mm
    for item in [
        "Confirmação até X horas antes.",
        "Atraso acima de Y minutos pode reduzir o serviço ou remarcar.",
        "2 no-shows seguidos = próximo horário menos nobre (ou sinal simbólico).",
        "Comunique na marcação — não depois da briga.",
    ]:
        y = bullet(c, item, y)
        y -= 2 * mm
    y -= 6 * mm
    y = body(
        c,
        "Objetivo: proteger a cadeira e o barbeiro. Sem clínica chata.",
        y,
        12,
    )

    # —— 8 CHECKLIST ——
    y = new_page(c, pages, 0)
    y = section_label(c, "Execução", y)
    y = heading(c, "Checklist — 7 dias", y)
    y -= 4 * mm
    for i, item in enumerate(
        [
            "Calcule A, T e R$ deixado na mesa.",
            "Ajuste expediente e bloqueios.",
            "Salve os 3 scripts.",
            "Monte lista de espera (10 clientes).",
            "Publique a regra anti no-show.",
            "Coloque a agenda online no ar com a cara da casa (Barbernegon).",
            "Meça de novo e compare com o Dia 1.",
        ],
        start=1,
    ):
        text_color(c, ACCENT)
        c.setFont(FONT_B, 12)
        c.drawString(MARGIN, y, f"{i}.")
        y = draw_wrapped(
            c,
            item,
            MARGIN + 8 * mm,
            y,
            W - 2 * MARGIN - 8 * mm,
            FONT,
            12,
            16,
            FG,
        )
        y -= 3 * mm

    # —— 9 ERROS ——
    y = new_page(c, pages, 1)
    y = section_label(c, "Armadilhas", y)
    y = heading(c, "Erros que matam o resultado", y)
    y -= 4 * mm
    for item in [
        "Continuar marcando só no chat sem confirmação.",
        "Inventar processo pesado demais e abandonar em 48h.",
        "Usar marketplace como único motor e achar que marca é logo de app.",
        "Ter site bonito sem agenda — ou agenda sem identidade.",
    ]:
        y = bullet(c, item, y)
        y -= 3 * mm

    # —— 10 TOUR S08 ——
    y = new_page(c, pages, 0)
    y = section_label(c, "Aplicação no Barbernegon · tour 1/4", y)
    y = heading(c, "Dashboard — enxergar a operação", y)
    y -= 3 * mm
    y = body(
        c,
        "Você já mapeou onde a vaga some. O Barbernegon tira isso do improviso: site com a sua cara, agenda em segundos, painel limpo.",
        y,
    )
    y -= 3 * mm
    y = framed_shot(
        c,
        SHOTS / "S08-dashboard.png",
        y,
        "Dashboard de produção — volume, status e prioridades (volta ao diagnóstico).",
        max_h=100 * mm,
    )

    # —— 10 TOUR S09 ——
    y = new_page(c, pages, 1)
    y = section_label(c, "Tour 2/4", y)
    y = heading(c, "Agenda no admin — buracos e reservas", y)
    y -= 3 * mm
    y = body(
        c,
        "Visão da grade por período: onde a ocupação cai, onde dá para encaixar.",
        y,
    )
    y -= 3 * mm
    y = framed_shot(
        c,
        SHOTS / "S09-admin-lista.png",
        y,
        "Agendamentos (produção) — prova visual dos vazadouros 5.1 e 5.3.",
        max_h=105 * mm,
    )

    # —— 10 TOUR S10/S12 ——
    y = new_page(c, pages, 0)
    y = section_label(c, "Tour 3/4 · prova social", y)
    y = heading(c, "Site white-label do piloto", y)
    y -= 3 * mm
    y = body(
        c,
        "O tenant /ze-do-corte roda site + agenda na prática — não só no discurso.",
        y,
    )
    y -= 3 * mm
    y = framed_shot(
        c,
        SHOTS / "S12-piloto.png",
        y,
        "Piloto em produção: marca própria fora do marketplace.",
        max_h=105 * mm,
    )

    # —— 10 TOUR S11 marca ——
    y = new_page(c, pages, 1)
    y = section_label(c, "Tour 4/4", y)
    y = heading(c, "Identidade da marca no painel", y)
    y -= 3 * mm
    y = body(
        c,
        "Nome, slug, logo, cores e redes — a casa publica a própria URL. Caixa e Clube entram no Pro quando a agenda estabiliza (próximo nível: dinheiro e recorrência).",
        y,
    )
    y -= 3 * mm
    y = framed_shot(
        c,
        SHOTS / "S11-caixa.png",
        y,
        "Marca (produção): identidade e slug /ze-do-corte — base da presença própria.",
        max_h=100 * mm,
    )

    # —— CTA / CONTRACAPA ——
    y = new_page(c, pages, 0)
    y = section_label(c, "Fechamento", y)
    y = heading(c, "Você já sabe onde a vaga some", y)
    y -= 4 * mm
    y = body(
        c,
        "Agora tire a agenda do improviso. Crie sua barbearia no Barbernegon, publique seu link e rode o checklist de 7 dias.",
        y,
        12,
    )
    y -= 10 * mm
    text_color(c, FG)
    c.setFont(FONT_B, 16)
    c.drawString(MARGIN, y, "Sua barbearia, sua cara, sem burocracia.")
    y -= 12 * mm
    c.setFillColorRGB(*ACCENT)
    c.roundRect(MARGIN, y - 4 * mm, 72 * mm, 12 * mm, 3, fill=1, stroke=0)
    text_color(c, BG)
    c.setFont(FONT_B, 11)
    c.drawCentredString(MARGIN + 36 * mm, y, "Começar no Barbernegon")
    y -= 24 * mm
    y = body(
        c,
        "Material educativo de entrada (R$ 19,90). Adapte as regras à sua operação.",
        y,
        10,
    )
    y -= 8 * mm
    text_color(c, MUTED)
    c.setFont(FONT, 9)
    c.drawString(MARGIN, 22 * mm, "Barbernegon · Vaga Perdida")
    c.drawString(MARGIN, 17 * mm, "© Barbernegon — prints capturados em produção.")

    total = len(pages)
    # Reabrir para footers não é trivial; desenhar número simples já feito via…
    # Em vez disso, gravamos e aceitamos sem X/Y em todas — adicionamos agora
    # percorrendo com form? Skip: reportlab não permite fácil. Footer parcial:
    # Vamos usar onPage callback — refactor rápido:

    c.save()

    # Segunda passada: carimba página X/Y
    from pypdf import PdfReader, PdfWriter
    from reportlab.pdfgen import canvas as canvas2
    from io import BytesIO

    reader = PdfReader(str(OUT))
    writer = PdfWriter()
    total = len(reader.pages)
    for i, page in enumerate(reader.pages, start=1):
        packet = BytesIO()
        overlay = canvas2.Canvas(packet, pagesize=A4)
        overlay.setFillColorRGB(*MUTED)
        overlay.setFont(FONT, 8)
        overlay.drawString(MARGIN, 10 * mm, "Barbernegon · Vaga Perdida")
        overlay.drawRightString(W - MARGIN, 10 * mm, f"{i} / {total}")
        overlay.save()
        packet.seek(0)
        from pypdf import PdfReader as PR2

        ov = PR2(packet)
        page.merge_page(ov.pages[0])
        writer.add_page(page)

    with open(OUT, "wb") as f:
        writer.write(f)

    OUT_ROOT.write_bytes(OUT.read_bytes())
    ARTIFACT.parent.mkdir(parents=True, exist_ok=True)
    ARTIFACT.write_bytes(OUT.read_bytes())
    print(f"PDF OK: {OUT} ({total} páginas, {OUT.stat().st_size} bytes)")
    return OUT


if __name__ == "__main__":
    build()

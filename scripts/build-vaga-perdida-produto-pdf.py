#!/usr/bin/env python3
"""
Vaga Perdida — PDF workbook (layout corrigido).
Campos com label acima do box, gráfico sem sobreposição, contraste legível.
"""

from __future__ import annotations

from io import BytesIO
from pathlib import Path

from PIL import Image as PILImage
from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path("/workspace")
SHOTS = ROOT / "docs/infoprodutos/screenshots"
OUT = ROOT / "docs/infoprodutos/vaga-perdida-barbernegon.pdf"
OUT_ALT = ROOT / "docs/infoprodutos/vaga-perdida-produto.pdf"
ARTIFACT = Path("/opt/cursor/artifacts/infoprodutos/vaga-perdida-barbernegon.pdf")

BG = (0x0A / 255, 0x0E / 255, 0x13 / 255)
SURF = (0x12 / 255, 0x18 / 255, 0x22 / 255)
ELEV = (0x18 / 255, 0x21 / 255, 0x2E / 255)
FIELD = (0x1A / 255, 0x24 / 255, 0x33 / 255)
LINE = (0x3A / 255, 0x4A / 255, 0x60 / 255)
FG = (0xE8 / 255, 0xEE / 255, 0xF6 / 255)
MUTED = (0xB0 / 255, 0xBC / 255, 0xCE / 255)
BLUE = (0x3B / 255, 0x82 / 255, 0xF6 / 255)
SOFT = (0x8E / 255, 0xB6 / 255, 0xFF / 255)
OK = (0x34 / 255, 0xD3 / 255, 0x99 / 255)

W, H = A4
M = 16 * mm
FOOTER = 14 * mm


def fonts():
    reg = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    bold = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
    if reg.exists() and bold.exists():
        pdfmetrics.registerFont(TTFont("VP", str(reg)))
        pdfmetrics.registerFont(TTFont("VPB", str(bold)))
        return "VP", "VPB"
    return "Helvetica", "Helvetica-Bold"


F, FB = fonts()


class Book:
    def __init__(self):
        self.buf = BytesIO()
        self.c = canvas.Canvas(self.buf, pagesize=A4)
        self.n = 0

    def page(self):
        if self.n:
            self.c.showPage()
        self.n += 1
        c = self.c
        c.setFillColorRGB(*BG)
        c.rect(0, 0, W, H, fill=1, stroke=0)
        # faixa superior limpa (sem diagonal que invade conteúdo)
        c.setFillColorRGB(*BLUE)
        c.rect(0, H - 2.4 * mm, W, 2.4 * mm, fill=1, stroke=0)
        c.setFillColorRGB(*SURF)
        c.rect(0, H - 18 * mm, W, 15.6 * mm, fill=1, stroke=0)
        return H - 26 * mm

    def save(self):
        self.c.save()
        self.buf.seek(0)
        reader = PdfReader(self.buf)
        writer = PdfWriter()
        total = len(reader.pages)
        for i, page in enumerate(reader.pages, start=1):
            packet = BytesIO()
            ov = canvas.Canvas(packet, pagesize=A4)
            ov.setFillColorRGB(*MUTED)
            ov.setFont(F, 7.5)
            ov.drawString(M, 7 * mm, "Barbernegon · Vaga Perdida")
            ov.drawRightString(W - M, 7 * mm, f"{i} / {total}")
            ov.save()
            packet.seek(0)
            page.merge_page(PdfReader(packet).pages[0])
            writer.add_page(page)
        data = BytesIO()
        writer.write(data)
        raw = data.getvalue()
        for path in (OUT, OUT_ALT, ARTIFACT):
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
        print(f"PDF OK pages={total} bytes={len(raw)} → {OUT}")


def wrap(c, text, x, y, max_w, font, size, leading, color=MUTED, center=False):
    c.setFillColorRGB(*color)
    c.setFont(font, size)
    words = text.split()
    lines, cur = [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if c.stringWidth(t, font, size) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    for line in lines:
        if center:
            c.drawCentredString(x + max_w / 2, y, line)
        else:
            c.drawString(x, y, line)
        y -= leading
    return y


def kicker(c, text, y):
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 8)
    c.drawString(M, y, text.upper())
    return y - 8 * mm


def heading(c, text, y, size=20):
    return wrap(c, text, M, y, W - 2 * M, FB, size, size + 4, FG)


def para(c, text, y, size=10):
    return wrap(c, text, M, y, W - 2 * M, F, size, size + 4.5, MUTED)


def card(c, x, y, w, h, fill=ELEV, stroke=LINE, sw=1):
    c.setFillColorRGB(*fill)
    c.setStrokeColorRGB(*stroke)
    c.setLineWidth(sw)
    c.roundRect(x, y, w, h, 4, fill=1, stroke=1)


def field(c, x, y, w, box_h, label_txt):
    """
    Label claramente ACIMA do retângulo.
    y = baseline da label. Retorna y abaixo do campo (com margem).
    """
    c.setFillColorRGB(*MUTED)
    c.setFont(F, 8)
    c.drawString(x, y, label_txt)
    box_top = y - 4 * mm  # folga entre label e box
    box_bottom = box_top - box_h
    c.setFillColorRGB(*FIELD)
    c.setStrokeColorRGB(*SOFT)
    c.setLineWidth(1.1)
    c.roundRect(x, box_bottom, w, box_h, 3, fill=1, stroke=1)
    # linha guia para escrita
    c.setStrokeColorRGB(*LINE)
    c.setLineWidth(0.7)
    c.line(x + 3 * mm, box_bottom + 4.5 * mm, x + w - 3 * mm, box_bottom + 4.5 * mm)
    return box_bottom - 5 * mm


def fields_row(c, y, specs):
    """specs: list of (label, width_frac) summing ~1.0. Same baseline y."""
    gap = 4 * mm
    usable = W - 2 * M - gap * (len(specs) - 1)
    x = M
    bottoms = []
    for label_txt, frac in specs:
        w = usable * frac
        bottoms.append(field(c, x, y, w, 11 * mm, label_txt))
        x += w + gap
    return min(bottoms)


def check(c, x, y, text):
    s = 4.2 * mm
    c.setStrokeColorRGB(*SOFT)
    c.setFillColorRGB(*FIELD)
    c.setLineWidth(1.1)
    c.roundRect(x, y - s + 1 * mm, s, s, 1.2, fill=1, stroke=1)
    c.setFillColorRGB(*FG)
    c.setFont(F, 9.5)
    c.drawString(x + s + 3 * mm, y - 1 * mm, text)
    return y - 8.5 * mm


def shot(c, name, y_top, caption, max_h=70 * mm):
    path = SHOTS / name
    if not path.exists():
        return y_top - 6 * mm
    im = PILImage.open(path)
    iw, ih = im.size
    max_w = W - 2 * M
    scale = min(max_w / iw, max_h / ih)
    dw, dh = iw * scale, ih * scale
    x = M + (max_w - dw) / 2
    y = y_top - dh
    pad = 1.8 * mm
    c.setFillColorRGB(*LINE)
    c.roundRect(x - pad, y - pad, dw + 2 * pad, dh + 2 * pad, 3, fill=1, stroke=0)
    c.setStrokeColorRGB(*BLUE)
    c.setLineWidth(1)
    c.roundRect(x - pad, y - pad, dw + 2 * pad, dh + 2 * pad, 3, fill=0, stroke=1)
    c.drawImage(ImageReader(path), x, y, width=dw, height=dh, mask="auto")
    return wrap(c, caption, M, y - 4.5 * mm, max_w, F, 7.5, 9.5, MUTED, True)


def chart_cover(c, x, y, w, h):
    """
    Layout em duas colunas sem sobreposição:
    esquerda = número + barras + legendas
    direita = fórmula em bloco próprio
    """
    a, t, ticket = 40, 31, 75
    lost = a - t
    money = lost * ticket

    card(c, x, y, w, h, SURF, LINE, 1)

    # esquerda (~58%)
    left_w = w * 0.55
    pad = 5 * mm
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 7.5)
    c.drawString(x + pad, y + h - 6 * mm, "RESULTADO DA SEMANA (EXEMPLO)")

    c.setFillColorRGB(*FG)
    c.setFont(FB, 28)
    c.drawString(x + pad, y + h - 18 * mm, f"R$ {money}".replace(",", "."))

    c.setFillColorRGB(*MUTED)
    c.setFont(F, 8.5)
    c.drawString(
        x + pad,
        y + h - 24 * mm,
        f"{lost} vagas perdidas  ·  ocupação {round(100 * t / a)}%",
    )

    # barras — área dedicada, labels FORA das barras
    bar_bottom = y + 14 * mm
    bar_max = y + h - 32 * mm - bar_bottom
    bw = left_w * 0.28
    gap = 8 * mm
    bx1 = x + pad + 4 * mm
    bx2 = bx1 + bw + gap
    h1 = bar_max * (t / a)
    h2 = bar_max * (lost / a)

    c.setFillColorRGB(*OK)
    c.roundRect(bx1, bar_bottom, bw, h1, 3, fill=1, stroke=0)
    c.setFillColorRGB(*BLUE)
    c.roundRect(bx2, bar_bottom, bw, h2, 3, fill=1, stroke=0)

    c.setFillColorRGB(*MUTED)
    c.setFont(F, 7.5)
    c.drawCentredString(bx1 + bw / 2, y + 6 * mm, "Atendidos")
    c.drawCentredString(bx2 + bw / 2, y + 6 * mm, "Perdidas")

    # valores acima das barras
    c.setFillColorRGB(*FG)
    c.setFont(FB, 8)
    c.drawCentredString(bx1 + bw / 2, bar_bottom + h1 + 2 * mm, str(t))
    c.drawCentredString(bx2 + bw / 2, bar_bottom + h2 + 2 * mm, str(lost))

    # direita: card da fórmula (sem sobrepor barras)
    rx = x + left_w + 2 * mm
    rw = w - left_w - pad - 2 * mm
    ry = y + 8 * mm
    rh = h - 16 * mm
    card(c, rx, ry, rw, rh, ELEV, BLUE, 1.2)

    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 8)
    c.drawString(rx + 3.5 * mm, ry + rh - 7 * mm, "FÓRMULA")

    c.setFillColorRGB(*FG)
    c.setFont(FB, 10)
    c.drawString(rx + 3.5 * mm, ry + rh - 16 * mm, "Vagas = A − T")
    c.drawString(rx + 3.5 * mm, ry + rh - 23 * mm, "R$ = vagas × Ticket")

    c.setFillColorRGB(*MUTED)
    c.setFont(F, 8)
    c.drawString(rx + 3.5 * mm, ry + rh - 32 * mm, "Exemplo:")
    c.setFillColorRGB(*SOFT)
    c.setFont(F, 8)
    c.drawString(rx + 3.5 * mm, ry + rh - 38 * mm, f"A = {a}")
    c.drawString(rx + 3.5 * mm, ry + rh - 43 * mm, f"T = {t}")
    c.drawString(rx + 3.5 * mm, ry + rh - 48 * mm, f"Ticket = {ticket}")


def step_card(c, x, y, w, h, num, title, blurb):
    card(c, x, y, w, h, ELEV)
    c.setFillColorRGB(*BLUE)
    c.setFont(FB, 11)
    c.drawString(x + 4 * mm, y + h - 8 * mm, num)
    c.setFillColorRGB(*FG)
    c.setFont(FB, 11)
    c.drawString(x + 4 * mm, y + h - 15 * mm, title)
    wrap(c, blurb, x + 4 * mm, y + h - 21 * mm, w - 8 * mm, F, 8, 10, MUTED)


def build():
    b = Book()
    c = b.c

    # —— 1 CAPA ——
    y = b.page()
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 8)
    c.drawString(M, H - 12 * mm, "PRODUTO BARBERNEGON  ·  R$ 19,90  ·  WORKBOOK")
    y = H - 32 * mm
    c.setFillColorRGB(*FG)
    c.setFont(FB, 36)
    c.drawString(M, y, "Vaga Perdida")
    y -= 12 * mm
    y = para(
        c,
        "Pare de deixar dinheiro na mesa na agenda — e coloque a marcação sob o controle da sua marca.",
        y,
        11,
    )
    y -= 5 * mm
    c.setFillColorRGB(*BLUE)
    c.rect(M, y, 24 * mm, 1.2 * mm, fill=1, stroke=0)
    y -= 8 * mm
    y = wrap(
        c,
        "Produto para usar: calcular, marcar vazadouros, copiar scripts e executar em 7 dias.",
        M,
        y,
        W - 2 * M,
        FB,
        10,
        13,
        FG,
    )
    y -= 5 * mm
    chart_h = 95 * mm
    chart_cover(c, M, max(FOOTER + 4 * mm, y - chart_h), W - 2 * M, chart_h)

    # —— 2 COMO USAR ——
    y = b.page()
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 8)
    c.drawString(M, H - 12 * mm, "COMO USAR")
    y = kicker(c, "Comece aqui", y)
    y = heading(c, "4 movimentos. 7 dias.", y)
    y -= 3 * mm
    y = para(c, "Cada página pede uma ação. Preencha. No fim da semana, volte ao cálculo e compare.", y)
    y -= 6 * mm
    tw = (W - 2 * M - 6 * mm) / 2
    th = 26 * mm
    steps = [
        ("01", "Diagnosticar", "Calcule A, T e o R$ na mesa"),
        ("02", "Marcar", "Assinale os vazadouros da casa"),
        ("03", "Aplicar", "Método + scripts prontos"),
        ("04", "Executar", "Checklist de 7 dias"),
    ]
    for i, (n, t, d) in enumerate(steps):
        col, row = i % 2, i // 2
        step_card(
            c,
            M + col * (tw + 6 * mm),
            y - (row + 1) * (th + 4 * mm) + 4 * mm,
            tw,
            th,
            n,
            t,
            d,
        )
    y -= 2 * (th + 4 * mm) + 4 * mm
    y = kicker(c, "Sua casa", y)
    y = field(c, M, y, W - 2 * M, 11 * mm, "Nome da barbearia")
    y = fields_row(c, y, [("Cidade", 0.55), ("Nº de barbeiros", 0.45)])
    y -= 4 * mm
    card(c, M, y - 28 * mm, W - 2 * M, 28 * mm, ELEV, BLUE, 1.1)
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 8)
    c.drawString(M + 4 * mm, y - 7 * mm, "PROMESSA")
    wrap(
        c,
        "Em 7 dias você tem o número, os vazadouros mapeados e a agenda com presença própria (site + marcação online).",
        M + 4 * mm,
        y - 13 * mm,
        W - 2 * M - 8 * mm,
        F,
        10,
        13,
        FG,
    )

    # —— 3 CONCEITO ——
    y = b.page()
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 8)
    c.drawString(M, H - 12 * mm, "CONCEITO")
    y = kicker(c, "Definição", y)
    y = heading(c, "O que é uma vaga perdida", y)
    y -= 3 * mm
    y = para(
        c,
        "Horário que poderia ter gerado atendimento e não gerou — mesmo com gente pedindo horário.",
        y,
    )
    y -= 5 * mm
    # 5 tiles
    items = [
        ("01", "No-show", "Confirmou e sumiu"),
        ("02", "Horário morto", "Buraco sem encaixe"),
        ("03", "Só WhatsApp", "Demora = perde"),
        ("04", "Marketplace", "Hábito fora da marca"),
        ("05", "Sem cara", "Compromisso fraco"),
    ]
    tw = (W - 2 * M - 8 * mm) / 3
    th = 28 * mm
    for i, (n, t, d) in enumerate(items[:3]):
        x = M + i * (tw + 4 * mm)
        card(c, x, y - th, tw, th)
        c.setStrokeColorRGB(*SOFT)
        c.setLineWidth(1)
        c.roundRect(x + 3 * mm, y - 8 * mm, 4 * mm, 4 * mm, 1, fill=0, stroke=1)
        c.setFillColorRGB(*BLUE)
        c.setFont(FB, 8)
        c.drawString(x + 9 * mm, y - 7 * mm, n)
        c.setFillColorRGB(*FG)
        c.setFont(FB, 10)
        c.drawString(x + 3 * mm, y - 14 * mm, t)
        wrap(c, d, x + 3 * mm, y - 20 * mm, tw - 6 * mm, F, 7.5, 9.5, MUTED)
    y -= th + 5 * mm
    tw2 = (W - 2 * M - 4 * mm) / 2
    for i, (n, t, d) in enumerate(items[3:]):
        x = M + i * (tw2 + 4 * mm)
        card(c, x, y - th, tw2, th)
        c.setStrokeColorRGB(*SOFT)
        c.setLineWidth(1)
        c.roundRect(x + 3 * mm, y - 8 * mm, 4 * mm, 4 * mm, 1, fill=0, stroke=1)
        c.setFillColorRGB(*BLUE)
        c.setFont(FB, 8)
        c.drawString(x + 9 * mm, y - 7 * mm, n)
        c.setFillColorRGB(*FG)
        c.setFont(FB, 10)
        c.drawString(x + 3 * mm, y - 14 * mm, t)
        wrap(c, d, x + 3 * mm, y - 20 * mm, tw2 - 6 * mm, F, 7.5, 9.5, MUTED)
    y -= th + 8 * mm
    y = wrap(
        c,
        "Regra de ouro: cadeira vazia com demanda possível não é “dia fraco”. É vazão de operação.",
        M,
        y,
        W - 2 * M,
        FB,
        10,
        13,
        FG,
    )

    # —— 4 CALCULADORA ——
    y = b.page()
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 8)
    c.drawString(M, H - 12 * mm, "FERRAMENTA · DIAGNÓSTICO 15 MIN")
    y = kicker(c, "Passo 1", y)
    y = heading(c, "Calcule o estrago", y)
    y -= 3 * mm
    y = para(c, "Use a última semana real. Preencha os três campos e complete o resultado.", y)
    y -= 5 * mm
    y = field(c, M, y, W - 2 * M, 12 * mm, "A — Horários abertos no expediente")
    y = field(c, M, y, W - 2 * M, 12 * mm, "T — Atendimentos realizados de fato")
    y = field(c, M, y, W - 2 * M, 12 * mm, "Ticket — preço do serviço mais vendido (R$)")
    y -= 2 * mm
    rh = 34 * mm
    card(c, M, y - rh, W - 2 * M, rh, ELEV, BLUE, 1.4)
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 8)
    c.drawString(M + 4 * mm, y - 6 * mm, "SEU RESULTADO")
    c.setFillColorRGB(*FG)
    c.setFont(FB, 12)
    c.drawString(M + 4 * mm, y - 15 * mm, "Vagas perdidas (A − T)  =  ____________")
    c.drawString(M + 4 * mm, y - 24 * mm, "R$ deixado na mesa      =  R$ ____________")
    y -= rh + 5 * mm
    y = shot(
        c,
        "S01-dashboard.png",
        y,
        "Painel real — o número que você calcular aqui é o que a operação precisa enxergar.",
        52 * mm,
    )

    # —— 5 VAZADOUROS CHECK ——
    y = b.page()
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 8)
    c.drawString(M, H - 12 * mm, "DIAGNÓSTICO")
    y = kicker(c, "Passo 2", y)
    y = heading(c, "Marque o que acontece na sua casa", y)
    y -= 4 * mm
    for t in [
        "No-show — confirmação fraca",
        "Horário morto — buraco sem reposição",
        "Só WhatsApp — canal único",
        "Marketplace — cliente compara e some",
        "Sem cara digital — parece “mais uma”",
    ]:
        y = check(c, M, y, t)
    y -= 3 * mm
    y = field(c, M, y, W - 2 * M, 14 * mm, "O vazadouro nº 1 da minha casa é…")
    y -= 2 * mm
    y = shot(
        c,
        "S02-admin-reservas.png",
        y,
        "Grade de agendamentos: onde a ocupação cai, a vaga some.",
        62 * mm,
    )

    # —— 6 CANAL ——
    y = b.page()
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 8)
    c.drawString(M, H - 12 * mm, "VAZADOURO · CANAL ÚNICO")
    y = kicker(c, "Solução", y)
    y = heading(c, "Tire a agenda do chat solto", y)
    y -= 3 * mm
    y = para(
        c,
        "WhatsApp é relacionamento. Marcação precisa de fluxo próprio — o cliente escolhe horário sem esperar sua resposta.",
        y,
    )
    y -= 4 * mm
    y = shot(c, "S03-agendar.png", y, "Agenda online do piloto — serviço, horário e resumo.", 78 * mm)
    y -= 3 * mm
    y = field(c, M, y, W - 2 * M, 12 * mm, "Hoje eu marco horário principalmente em…")

    # —— 7 REPOSIÇÃO ——
    y = b.page()
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 8)
    c.drawString(M, H - 12 * mm, "VAZADOURO · REPOSIÇÃO")
    y = kicker(c, "Solução", y)
    y = heading(c, "Cancelou de manhã. E agora?", y)
    y -= 3 * mm
    y = para(c, "Sem lista de encaixe, a vaga morre. Veja o buraco cedo e dispare a lista.", y)
    y -= 4 * mm
    y = shot(c, "S04-admin-dia.png", y, "Operacional do dia — buracos e a receber visíveis.", 70 * mm)
    y -= 3 * mm
    y = field(c, M, y, W - 2 * M, 12 * mm, "Lista de encaixe (10 nomes flexíveis)")
    y = field(c, M, y, W - 2 * M, 11 * mm, "…")

    # —— 8 MARCA ——
    y = b.page()
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 8)
    c.drawString(M, H - 12 * mm, "VAZADOURO · MARKETPLACE / CARA")
    y = kicker(c, "Solução", y)
    y = heading(c, "Presença própria", y)
    y -= 3 * mm
    y = para(c, "No marketplace o hábito fica com a plataforma. Com site + agenda na sua URL, a marca é sua.", y)
    y -= 3 * mm
    y = shot(c, "S05-site-home.png", y, "Site white-label do piloto /ze-do-corte.", 72 * mm)
    y -= 2 * mm
    y = shot(c, "S06-site-servicos.png", y, "Identidade no canvas — não template genérico.", 48 * mm)

    # —— 9 MÉTODO ——
    y = b.page()
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 8)
    c.drawString(M, H - 12 * mm, "MÉTODO")
    y = kicker(c, "Passo 3", y)
    y = heading(c, "4 passos · seu plano", y)
    y -= 4 * mm
    blocks = [
        ("A · Padronize", "Expediente real, bloqueios, serviços longos vs curtos, janelas de encaixe."),
        ("B · Confirme", "Marcação + lembrete na véspera."),
        ("C · Reponha", "Lista de 10–20 flexíveis. Cancelou → dispara."),
        ("D · Canal próprio", "Site da marca + agenda online."),
    ]
    for t, d in blocks:
        c.setFillColorRGB(*SOFT)
        c.setFont(FB, 10)
        c.drawString(M, y, t)
        y -= 4 * mm
        y = wrap(c, d, M, y, W - 2 * M, F, 8.5, 11, MUTED)
        y -= 1 * mm
        y = field(c, M, y, W - 2 * M, 10 * mm, "Como vou aplicar")
        y -= 2 * mm

    # —— 10 SCRIPTS ——
    y = b.page()
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 8)
    c.drawString(M, H - 12 * mm, "SCRIPTS")
    y = kicker(c, "Copie e personalize", y)
    y = heading(c, "3 mensagens prontas", y)
    y -= 4 * mm
    scripts = [
        (
            "MARCAÇÃO",
            "Fala, [Nome]! Seu horário na [Barbearia] está marcado para [dia] às [hora] — [serviço]. Responde 1 para confirmar ou 2 para remarcar.",
        ),
        (
            "VÉSPERA",
            "[Nome], amanhã às [hora] te esperamos. Se não puder, avisa até [limite] que eu encaixo outra pessoa.",
        ),
        (
            "ENCAIXE",
            "Abriu vaga hoje às [hora] para [serviço]. Quer encaixar? Responde AGORA.",
        ),
    ]
    for lab, txt in scripts:
        bh = 24 * mm
        card(c, M, y - bh, W - 2 * M, bh, ELEV)
        c.setFillColorRGB(*BLUE)
        c.setFont(FB, 8)
        c.drawString(M + 4 * mm, y - 6 * mm, lab)
        wrap(c, txt, M + 4 * mm, y - 12 * mm, W - 2 * M - 8 * mm, F, 8, 10.5, FG)
        y -= bh + 4 * mm
    y -= 1 * mm
    y = shot(c, "S07-agendar-form.png", y, "Cliente marca no navegador — você opera o painel.", 52 * mm)

    # —— 11 CHECKLIST ——
    y = b.page()
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 8)
    c.drawString(M, H - 12 * mm, "EXECUÇÃO")
    y = kicker(c, "Passo 4", y)
    y = heading(c, "Anti no-show + 7 dias", y)
    y -= 4 * mm
    for t in [
        "Confirmação até ___ horas antes",
        "Atraso acima de ___ min → reduz ou remarca",
        "2 no-shows seguidos → horário menos nobre",
        "Comunico na marcação — não depois da briga",
    ]:
        y = check(c, M, y, t)
    y -= 5 * mm
    y = kicker(c, "Checklist · 7 dias", y)
    for d in [
        "Dia 1 — Calculei A, T e R$ na mesa",
        "Dia 2 — Ajustei expediente e bloqueios",
        "Dia 3 — Salvei os 3 scripts",
        "Dia 4 — Montei lista de espera (10)",
        "Dia 5 — Publiquei regra anti no-show",
        "Dia 6 — Publiquei agenda com a cara da casa",
        "Dia 7 — Medi de novo e comparei",
    ]:
        y = check(c, M, y, d)
    y -= 3 * mm
    y = field(c, M, y, W - 2 * M, 12 * mm, "Semana 2 — R$ deixado na mesa (novo cálculo)")

    # —— 12 PROVA ——
    y = b.page()
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 8)
    c.drawString(M, H - 12 * mm, "PROVA · BARBERNEGON")
    y = kicker(c, "Prints reais", y)
    y = heading(c, "Tire a agenda do improviso", y)
    y -= 3 * mm
    y = para(c, "Site com a sua cara, agenda em segundos, painel limpo.", y)
    y -= 4 * mm
    cell_w = (W - 2 * M - 4 * mm) / 2
    cell_h = 52 * mm
    grid = [
        ("S08-dashboard.png", "Painel"),
        ("S09-admin-lista.png", "Grade de vagas"),
        ("S12-piloto.png", "Site da marca"),
        ("S11c-marca.png", "Identidade"),
    ]
    for i, (fn, cap) in enumerate(grid):
        col, row = i % 2, i // 2
        x = M + col * (cell_w + 4 * mm)
        yy = y - row * (cell_h + 8 * mm) - cell_h
        path = SHOTS / fn
        card(c, x, yy, cell_w, cell_h, SURF)
        if path.exists():
            im = PILImage.open(path)
            iw, ih = im.size
            inner = 2.5 * mm
            scale = min((cell_w - 2 * inner) / iw, (cell_h - 9 * mm) / ih)
            dw, dh = iw * scale, ih * scale
            ix = x + (cell_w - dw) / 2
            iy = yy + 7 * mm + ((cell_h - 9 * mm) - dh) / 2
            c.drawImage(ImageReader(path), ix, iy, width=dw, height=dh, mask="auto")
        c.setFillColorRGB(*MUTED)
        c.setFont(F, 7.5)
        c.drawCentredString(x + cell_w / 2, yy + 2.5 * mm, cap)

    # —— 13 FECHO ——
    y = b.page()
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 8)
    c.drawString(M, H - 12 * mm, "FECHAMENTO")
    y = kicker(c, "Próximo passo", y)
    y = heading(c, "Você já sabe onde a vaga some", y, 22)
    y -= 5 * mm
    y = para(
        c,
        "Execute o checklist. Compare a semana 2 com a semana 1. Publique sua marca.",
        y,
        11,
    )
    y -= 8 * mm
    bh = 38 * mm
    card(c, M, y - bh, W - 2 * M, bh, ELEV, BLUE, 1.2)
    c.setFillColorRGB(*FG)
    c.setFont(FB, 14)
    c.drawString(M + 5 * mm, y - 12 * mm, "Sua barbearia, sua cara,")
    c.drawString(M + 5 * mm, y - 19 * mm, "sem burocracia.")
    c.setFillColorRGB(*MUTED)
    c.setFont(F, 9)
    c.drawString(M + 5 * mm, y - 28 * mm, "Crie no Barbernegon · publique o link · rode os 7 dias")
    y -= bh + 8 * mm
    y = field(c, M, y, W - 2 * M, 14 * mm, "Meu compromisso desta semana (1 frase)")
    y -= 8 * mm
    c.setFillColorRGB(*MUTED)
    c.setFont(F, 8)
    c.drawString(M, y, "Barbernegon · Vaga Perdida · material educativo (R$ 19,90)")
    y -= 4 * mm
    c.drawString(M, y, "Adapte as regras à sua operação. © Barbernegon")

    b.save()


if __name__ == "__main__":
    build()

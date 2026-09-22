#!/usr/bin/env python3
"""
Vaga Perdida — PDF produto (workbook visual).
Não é texto corrido: páginas com ação, gráfico, prints e campos para preencher.
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
OUT_V3 = ROOT / "docs/infoprodutos/vaga-perdida-produto.pdf"
ARTIFACT = Path("/opt/cursor/artifacts/infoprodutos/vaga-perdida-barbernegon.pdf")
ARTIFACT2 = Path("/opt/cursor/artifacts/infoprodutos/vaga-perdida-produto.pdf")

BG = (0x0A / 255, 0x0E / 255, 0x13 / 255)
SURF = (0x0F / 255, 0x14 / 255, 0x19 / 255)
ELEV = (0x15 / 255, 0x1C / 255, 0x26 / 255)
LINE = (0x1E / 255, 0x2A / 255, 0x3A / 255)
FG = (0xE2 / 255, 0xEA / 255, 0xF4 / 255)
MUTED = (0xA8 / 255, 0xB6 / 255, 0xC9 / 255)
BLUE = (0x3B / 255, 0x82 / 255, 0xF6 / 255)
SOFT = (0x8E / 255, 0xB6 / 255, 0xFF / 255)
OK = (0x34 / 255, 0xD3 / 255, 0x99 / 255)
WARN = (0xF5 / 255, 0x9E / 255, 0x0B / 255)

W, H = A4
M = 15 * mm


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

    def page(self, atmosphere=True):
        if self.n:
            self.c.showPage()
        self.n += 1
        c = self.c
        c.setFillColorRGB(*BG)
        c.rect(0, 0, W, H, fill=1, stroke=0)
        if atmosphere:
            c.setFillColorRGB(*SURF)
            p = c.beginPath()
            p.moveTo(0, H)
            p.lineTo(W * 0.58, H)
            p.lineTo(0, H * 0.42)
            p.close()
            c.drawPath(p, fill=1, stroke=0)
            # glow soft
            c.setFillColorRGB(BLUE[0], BLUE[1], BLUE[2])
            c.setFillAlpha(0.08)
            c.circle(W * 0.85, H * 0.9, 90 * mm, fill=1, stroke=0)
            c.setFillAlpha(1)
        c.setFillColorRGB(*BLUE)
        c.rect(0, H - 2.6 * mm, W, 2.6 * mm, fill=1, stroke=0)
        return H - 14 * mm

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
            ov.drawString(M, 8 * mm, "Barbernegon · Vaga Perdida · produto")
            ov.drawRightString(W - M, 8 * mm, f"{i} / {total}")
            ov.save()
            packet.seek(0)
            stamp = PdfReader(packet)
            page.merge_page(stamp.pages[0])
            writer.add_page(page)
        data = BytesIO()
        writer.write(data)
        raw = data.getvalue()
        for path in (OUT, OUT_V3, ARTIFACT, ARTIFACT2):
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


def label(c, text, y):
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 8)
    c.drawString(M, y, text.upper())
    return y - 7 * mm


def title(c, text, y, size=22):
    return wrap(c, text, M, y, W - 2 * M, FB, size, size + 3, FG)


def body(c, text, y, size=10.5):
    return wrap(c, text, M, y, W - 2 * M, F, size, size + 4, MUTED)


def card(c, x, y, w, h, fill=ELEV):
    c.setFillColorRGB(*fill)
    c.setStrokeColorRGB(*LINE)
    c.setLineWidth(1)
    c.roundRect(x, y, w, h, 5, fill=1, stroke=1)


def field(c, x, y, w, h, label_txt):
    c.setFillColorRGB(*MUTED)
    c.setFont(F, 7)
    c.drawString(x + 1.5 * mm, y + 1.2 * mm, label_txt)
    c.setFillColorRGB(*SURF)
    c.setStrokeColorRGB(*LINE)
    c.setLineWidth(1)
    c.roundRect(x, y - h + 1.5 * mm, w, h, 3.5, fill=1, stroke=1)
    # underline hint
    c.setStrokeColorRGB(*LINE)
    c.setLineWidth(0.6)
    c.line(x + 3 * mm, y - h + 5 * mm, x + w - 3 * mm, y - h + 5 * mm)
    return y - h - 2.5 * mm


def check(c, x, y, text):
    size = 4 * mm
    c.setStrokeColorRGB(*SOFT)
    c.setLineWidth(1.1)
    c.roundRect(x, y - size + 0.8 * mm, size, size, 1.2, fill=0, stroke=1)
    c.setFillColorRGB(*FG)
    c.setFont(F, 9.5)
    c.drawString(x + size + 2.8 * mm, y - 1.2 * mm, text)
    return y - 7.5 * mm


def shot(c, name, y_top, caption, max_h=72 * mm, max_w=None):
    path = SHOTS / name
    if not path.exists():
        return y_top - 8 * mm
    im = PILImage.open(path)
    iw, ih = im.size
    max_w = max_w or (W - 2 * M)
    scale = min(max_w / iw, max_h / ih)
    dw, dh = iw * scale, ih * scale
    x = M + (max_w - dw) / 2 if max_w == (W - 2 * M) else M
    # if custom max_w and left aligned
    if max_w != (W - 2 * M):
        x = M
    else:
        x = M + ((W - 2 * M) - dw) / 2
    y = y_top - dh
    pad = 1.6 * mm
    c.setFillColorRGB(*LINE)
    c.roundRect(x - pad, y - pad, dw + 2 * pad, dh + 2 * pad, 3, fill=1, stroke=0)
    c.setStrokeColorRGB(*BLUE)
    c.setLineWidth(0.9)
    c.roundRect(x - pad, y - pad, dw + 2 * pad, dh + 2 * pad, 3, fill=0, stroke=1)
    c.drawImage(ImageReader(path), x, y, width=dw, height=dh, mask="auto")
    return wrap(c, caption, M, y - 4 * mm, W - 2 * M, F, 7.5, 9.5, MUTED, True)


def chart_loss(c, x, y, w, h, a=40, t=31, ticket=75):
    """Gráfico + número grande — o ‘gancho’ visual do produto."""
    lost = max(a - t, 0)
    money = lost * ticket
    card(c, x, y, w, h, SURF)
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 7.5)
    c.drawString(x + 4 * mm, y + h - 6 * mm, "RESULTADO DA SEMANA (EXEMPLO)")
    c.setFillColorRGB(*FG)
    c.setFont(FB, 26)
    c.drawString(x + 4 * mm, y + h - 18 * mm, f"R$ {money:,}".replace(",", "."))
    c.setFillColorRGB(*MUTED)
    c.setFont(F, 8.5)
    c.drawString(x + 4 * mm, y + h - 24 * mm, f"{lost} vagas perdidas · ocupação {round(100 * t / a) if a else 0}%")

    # bars
    bar_area_top = y + h - 32 * mm
    bar_base = y + 12 * mm
    max_bar = bar_area_top - bar_base
    bw = w * 0.22
    gap = w * 0.1
    bx = x + w * 0.12
    h_t = max_bar * (t / a)
    h_l = max_bar * (lost / a)
    c.setFillColorRGB(*OK)
    c.roundRect(bx, bar_base, bw, h_t, 3, fill=1, stroke=0)
    c.setFillColorRGB(*BLUE)
    c.roundRect(bx + bw + gap, bar_base, bw, h_l, 3, fill=1, stroke=0)
    c.setFillColorRGB(*MUTED)
    c.setFont(F, 7.5)
    c.drawCentredString(bx + bw / 2, y + 5 * mm, "Atendidos")
    c.drawCentredString(bx + bw + gap + bw / 2, y + 5 * mm, "Perdidas")
    # side formula
    fx = x + w * 0.58
    c.setFillColorRGB(*FG)
    c.setFont(FB, 9)
    c.drawString(fx, y + h * 0.45, "Fórmula")
    c.setFillColorRGB(*MUTED)
    c.setFont(F, 8)
    c.drawString(fx, y + h * 0.45 - 5 * mm, "Vagas = A − T")
    c.drawString(fx, y + h * 0.45 - 10 * mm, "R$ = vagas × Ticket")
    c.setFillColorRGB(*SOFT)
    c.setFont(F, 7.5)
    c.drawString(fx, y + h * 0.45 - 17 * mm, f"A={a}  T={t}  Ticket={ticket}")


def leak_tile(c, x, y, w, h, num, name, desc):
    card(c, x, y, w, h, ELEV)
    # checkbox
    c.setStrokeColorRGB(*SOFT)
    c.setLineWidth(1)
    c.roundRect(x + 3 * mm, y + h - 8 * mm, 4 * mm, 4 * mm, 1, fill=0, stroke=1)
    c.setFillColorRGB(*BLUE)
    c.setFont(FB, 8)
    c.drawString(x + 9 * mm, y + h - 7 * mm, num)
    c.setFillColorRGB(*FG)
    c.setFont(FB, 10)
    c.drawString(x + 3 * mm, y + h - 14 * mm, name)
    wrap(c, desc, x + 3 * mm, y + h - 19 * mm, w - 6 * mm, F, 7.5, 9.5, MUTED)


def build():
    b = Book()
    c = b.c

    # ——— 1 CAPA ———
    y = b.page()
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 8.5)
    c.drawString(M, y, "PRODUTO BARBERNEGON  ·  R$ 19,90  ·  WORKBOOK")
    y -= 20 * mm
    c.setFillColorRGB(*FG)
    c.setFont(FB, 38)
    c.drawString(M, y, "Vaga")
    y -= 14 * mm
    c.drawString(M, y, "Perdida")
    y -= 12 * mm
    y = wrap(
        c,
        "Pare de deixar dinheiro na mesa na agenda da sua barbearia — e coloque a marcação sob o controle da sua marca.",
        M,
        y,
        W - 2 * M - 10 * mm,
        F,
        12,
        16,
        MUTED,
    )
    y -= 8 * mm
    c.setFillColorRGB(*BLUE)
    c.rect(M, y, 28 * mm, 1.4 * mm, fill=1, stroke=0)
    y -= 10 * mm
    y = wrap(
        c,
        "Isto é um produto para usar: calcular, marcar vazadouros, copiar scripts e executar em 7 dias. Não é PDF para folhear e esquecer.",
        M,
        y,
        W - 2 * M,
        FB,
        10.5,
        14,
        FG,
    )
    y -= 8 * mm
    chart_loss(c, M, y - 62 * mm, W - 2 * M, 62 * mm)

    # ——— 2 COMO USAR ESTE PRODUTO ———
    y = b.page()
    y = label(c, "Como usar este produto", y)
    y = title(c, "4 movimentos. 7 dias.", y, 24)
    y -= 4 * mm
    y = body(
        c,
        "Cada página pede uma ação. Preencha com caneta ou stylus. No fim da semana você volta ao cálculo e compara.",
        y,
    )
    y -= 6 * mm
    steps = [
        ("01", "Diagnosticar", "Calcule A, T e o R$ na mesa"),
        ("02", "Marcar", "Assinale os vazadouros da casa"),
        ("03", "Aplicar", "Método + scripts prontos"),
        ("04", "Executar", "Checklist de 7 dias"),
    ]
    tw = (W - 2 * M - 9 * mm) / 2
    th = 28 * mm
    for i, (n, t, d) in enumerate(steps):
        col, row = i % 2, i // 2
        x = M + col * (tw + 9 * mm)
        yy = y - row * (th + 5 * mm) - th
        card(c, x, yy, tw, th)
        c.setFillColorRGB(*BLUE)
        c.setFont(FB, 11)
        c.drawString(x + 4 * mm, yy + th - 8 * mm, n)
        c.setFillColorRGB(*FG)
        c.setFont(FB, 12)
        c.drawString(x + 4 * mm, yy + th - 15 * mm, t)
        c.setFillColorRGB(*MUTED)
        c.setFont(F, 8.5)
        c.drawString(x + 4 * mm, yy + th - 22 * mm, d)
    y -= 2 * (th + 5 * mm) + 6 * mm
    y = label(c, "Sua casa", y)
    y = field(c, M, y, W - 2 * M, 10 * mm, "Nome da barbearia")
    half = (W - 2 * M - 4 * mm) / 2
    field(c, M, y, half, 10 * mm, "Cidade")
    y = field(c, M + half + 4 * mm, y, half, 10 * mm, "Nº de barbeiros")
    y -= 2 * mm
    y = body(c, "Promessa: em 7 dias você tem o número, os vazadouros fechados e a agenda com presença própria.", y, 10)

    # ——— 3 CONCEITO + DIAGRAMA ———
    y = b.page()
    y = label(c, "Conceito", y)
    y = title(c, "O que é uma vaga perdida", y)
    y -= 3 * mm
    y = body(
        c,
        "Horário que poderia ter gerado atendimento e não gerou — mesmo com gente pedindo horário no dia a dia.",
        y,
    )
    y -= 5 * mm
    # funnel visual
    card(c, M, y - 42 * mm, W - 2 * M, 42 * mm, SURF)
    c.setFillColorRGB(*FG)
    c.setFont(FB, 10)
    c.drawString(M + 4 * mm, y - 7 * mm, "O dinheiro some em cascata")
    layers = [
        (0.92, "Horários abertos (A)", BLUE),
        (0.72, "Marcações confirmadas", SOFT),
        (0.55, "Cliente chegou", OK),
        (0.38, "Atendimento pago (T)", WARN),
    ]
    top = y - 12 * mm
    for i, (frac, txt, col) in enumerate(layers):
        lw = (W - 2 * M - 8 * mm) * frac
        lx = M + 4 * mm + ((W - 2 * M - 8 * mm) - lw) / 2
        ly = top - i * 7.2 * mm
        c.setFillColorRGB(*col)
        c.setFillAlpha(0.35 if i else 0.55)
        c.roundRect(lx, ly - 5 * mm, lw, 5.5 * mm, 2, fill=1, stroke=0)
        c.setFillAlpha(1)
        c.setFillColorRGB(*FG)
        c.setFont(F, 7.5)
        c.drawCentredString(W / 2, ly - 3.5 * mm, txt)
    y -= 48 * mm
    y = body(c, "Regra de ouro: cadeira vazia com demanda possível não é “dia fraco”. É vazão de operação.", y, 10)
    y -= 5 * mm
    y = label(c, "Os 5 vazadouros", y)
    names = [
        ("01", "No-show", "Confirmou e sumiu"),
        ("02", "Horário morto", "Buraco sem encaixe"),
        ("03", "Só WhatsApp", "Demora = perde"),
        ("04", "Marketplace", "Hábito fora da marca"),
        ("05", "Sem cara", "Compromisso fraco"),
    ]
    # 5 in a row-ish: 3 + 2
    tw = (W - 2 * M - 8 * mm) / 3
    th = 26 * mm
    for i, (n, t, d) in enumerate(names[:3]):
        leak_tile(c, M + i * (tw + 4 * mm), y - th, tw, th, n, t, d)
    y -= th + 4 * mm
    tw2 = (W - 2 * M - 4 * mm) / 2
    for i, (n, t, d) in enumerate(names[3:]):
        leak_tile(c, M + i * (tw2 + 4 * mm), y - th, tw2, th, n, t, d)

    # ——— 4 CALCULADORA WORKSHEET ———
    y = b.page()
    y = label(c, "Ferramenta · diagnóstico 15 min", y)
    y = title(c, "Calcule o estrago", y)
    y -= 3 * mm
    y = body(c, "Pegue a última semana real. Preencha. O gráfico da capa mostra o modelo — agora use seus números.", y)
    y -= 4 * mm
    y = field(c, M, y, W - 2 * M, 11 * mm, "A — Horários abertos no expediente")
    y = field(c, M, y, W - 2 * M, 11 * mm, "T — Atendimentos realizados de fato")
    y = field(c, M, y, W - 2 * M, 11 * mm, "Ticket — preço do serviço mais vendido (R$)")
    y -= 2 * mm
    card(c, M, y - 36 * mm, W - 2 * M, 38 * mm, ELEV)
    c.setStrokeColorRGB(*BLUE)
    c.setLineWidth(1.2)
    c.roundRect(M, y - 36 * mm, W - 2 * M, 38 * mm, 5, fill=0, stroke=1)
    c.setFillColorRGB(*SOFT)
    c.setFont(FB, 8)
    c.drawString(M + 4 * mm, y - 5 * mm, "SEU RESULTADO")
    c.setFillColorRGB(*FG)
    c.setFont(FB, 12)
    c.drawString(M + 4 * mm, y - 14 * mm, "Vagas perdidas (A − T)  =  ________")
    c.drawString(M + 4 * mm, y - 23 * mm, "R$ deixado na mesa  =  R$ ________")
    c.setFillColorRGB(*MUTED)
    c.setFont(F, 8)
    c.drawString(M + 4 * mm, y - 31 * mm, "Exemplo: A40 · T31 · Ticket75 → 9 vagas · R$ 675 na semana")
    y -= 42 * mm
    y = shot(
        c,
        "S01-dashboard.png",
        y,
        "Painel real (produção) — o número que você calcular aqui é o que a operação precisa enxergar todo dia.",
        58 * mm,
    )

    # ——— 5 VAZADOURO CHECK + S02 ———
    y = b.page()
    y = label(c, "Diagnóstico · check", y)
    y = title(c, "Marque o que acontece na sua casa", y)
    y -= 3 * mm
    for t in [
        "No-show — confirmação fraca",
        "Horário morto — buraco sem reposição",
        "Só WhatsApp — canal único",
        "Marketplace — cliente compara e some",
        "Sem cara digital — parece “mais uma”",
    ]:
        y = check(c, M, y, t)
    y -= 2 * mm
    y = field(c, M, y, W - 2 * M, 14 * mm, "O vazadouro nº 1 da minha casa é…")
    y -= 2 * mm
    y = shot(
        c,
        "S02-admin-reservas.png",
        y,
        "Grade de agendamentos: onde a ocupação cai, a vaga some. Use isso para escolher o vazadouro certo.",
        68 * mm,
    )

    # ——— 6 WHATSAPP + AGENDA ———
    y = b.page()
    y = label(c, "Vazadouro · canal único", y)
    y = title(c, "Tire a agenda do chat solto", y)
    y -= 3 * mm
    y = body(
        c,
        "WhatsApp é relacionamento. Marcação precisa de fluxo próprio: o cliente escolhe horário sem depender da sua resposta imediata.",
        y,
    )
    y -= 4 * mm
    y = shot(c, "S03-agendar.png", y, "Agenda online do piloto — serviço, horário e resumo em poucos toques.", 78 * mm)
    y -= 3 * mm
    y = field(c, M, y, W - 2 * M, 12 * mm, "Hoje eu marco horário principalmente em… (WhatsApp / telefone / outro)")

    # ——— 7 REPOSIÇÃO ———
    y = b.page()
    y = label(c, "Vazadouro · reposição", y)
    y = title(c, "Cancelou de manhã. E agora?", y)
    y -= 3 * mm
    y = body(
        c,
        "Sem lista de encaixe, a vaga morre até o fim do turno. No operacional você vê o buraco cedo e dispara a lista.",
        y,
    )
    y -= 4 * mm
    y = shot(c, "S04-admin-dia.png", y, "Operacional do dia — filas curtas, a receber e agenda. Buracos visíveis.", 72 * mm)
    y -= 3 * mm
    y = field(c, M, y, W - 2 * M, 12 * mm, "Nomes da minha lista de encaixe (10 pessoas flexíveis)")
    y = field(c, M, y, W - 2 * M, 10 * mm, "…")

    # ——— 8 MARCA PRÓPRIA ———
    y = b.page()
    y = label(c, "Vazadouro · marketplace / cara", y)
    y = title(c, "Presença própria, não aluguel de atenção", y)
    y -= 3 * mm
    y = body(
        c,
        "No marketplace o hábito fica com a plataforma. Com site + agenda na sua URL, a marca é sua.",
        y,
    )
    y -= 3 * mm
    y = shot(c, "S05-site-home.png", y, "Site white-label do piloto /ze-do-corte — a cara do salão, não um app genérico.", 78 * mm)
    y -= 2 * mm
    y = shot(c, "S06-site-servicos.png", y, "Mesmo editor do painel vira a página que o cliente vê no celular.", 48 * mm)

    # ——— 9 MÉTODO 4 PASSOS ———
    y = b.page()
    y = label(c, "Método", y)
    y = title(c, "4 passos · seu plano desta semana", y)
    y -= 4 * mm
    blocks = [
        ("A · Padronize", "Expediente real, bloqueios, serviços longos vs curtos, 1–2 janelas de encaixe."),
        ("B · Confirme", "Marcação + lembrete na véspera. Sem isso, no-show vira cultura."),
        ("C · Reponha", "Lista de 10–20 flexíveis. Cancelou → dispara em sequência."),
        ("D · Canal próprio", "Site da marca + agenda online. WhatsApp deixa de ser a secretária 24h."),
    ]
    for t, d in blocks:
        c.setFillColorRGB(*SOFT)
        c.setFont(FB, 10)
        c.drawString(M, y, t)
        y -= 4 * mm
        y = wrap(c, d, M, y, W - 2 * M, F, 8.5, 11, MUTED)
        y -= 1 * mm
        y = field(c, M, y, W - 2 * M, 9 * mm, "Como vou aplicar")
        y -= 1.5 * mm

    # ——— 10 SCRIPTS + FORM ———
    y = b.page()
    y = label(c, "Scripts prontos", y)
    y = title(c, "Copie, personalize, use", y)
    y -= 3 * mm
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
        card(c, M, y - 22 * mm, W - 2 * M, 23 * mm, ELEV)
        c.setFillColorRGB(*BLUE)
        c.setFont(FB, 8)
        c.drawString(M + 3.5 * mm, y - 5 * mm, lab)
        wrap(c, txt, M + 3.5 * mm, y - 10 * mm, W - 2 * M - 7 * mm, F, 8, 10.5, FG)
        y -= 26 * mm
    y -= 1 * mm
    y = shot(c, "S07-agendar-form.png", y, "Passo D na prática: o cliente marca no navegador — você opera o painel.", 55 * mm)

    # ——— 11 POLÍTICA + CHECKLIST ———
    y = b.page()
    y = label(c, "Regra da casa + execução", y)
    y = title(c, "Anti no-show simples", y)
    y -= 3 * mm
    for t in [
        "Confirmação até ___ horas antes",
        "Atraso acima de ___ min → reduz serviço ou remarca",
        "2 no-shows seguidos → horário menos nobre (ou sinal)",
        "Comunico na marcação — não depois da briga",
    ]:
        y = check(c, M, y, t)
    y -= 4 * mm
    y = label(c, "Checklist · 7 dias", y)
    days = [
        "Dia 1 — Calculei A, T e R$ na mesa",
        "Dia 2 — Ajustei expediente e bloqueios",
        "Dia 3 — Salvei os 3 scripts",
        "Dia 4 — Montei lista de espera (10)",
        "Dia 5 — Publiquei regra anti no-show",
        "Dia 6 — Publiquei agenda com a cara da casa",
        "Dia 7 — Medi de novo e comparei",
    ]
    for d in days:
        y = check(c, M, y, d)
    y -= 3 * mm
    y = field(c, M, y, W - 2 * M, 11 * mm, "Semana 2 — R$ deixado na mesa (novo cálculo)")

    # ——— 12 TOUR PROVA ———
    y = b.page()
    y = label(c, "Prova · Barbernegon", y)
    y = title(c, "Tire a agenda do improviso", y)
    y -= 3 * mm
    y = body(
        c,
        "Site com a sua cara, agenda em segundos, painel limpo. Prints reais do piloto em produção.",
        y,
    )
    y -= 3 * mm
    # 2x2 grid of smaller shots
    cell_w = (W - 2 * M - 4 * mm) / 2
    cell_h = 48 * mm
    shots_grid = [
        ("S08-dashboard.png", "Painel"),
        ("S09-admin-lista.png", "Grade de vagas"),
        ("S12-piloto.png", "Site da marca"),
        ("S11c-marca.png", "Identidade"),
    ]
    for i, (fn, cap) in enumerate(shots_grid):
        col, row = i % 2, i // 2
        x = M + col * (cell_w + 4 * mm)
        yy = y - row * (cell_h + 10 * mm) - cell_h
        path = SHOTS / fn
        if path.exists():
            im = PILImage.open(path)
            iw, ih = im.size
            pad = 1.2 * mm
            scale = min((cell_w - 2 * pad) / iw, (cell_h - 8 * mm) / ih)
            dw, dh = iw * scale, ih * scale
            card(c, x, yy, cell_w, cell_h, SURF)
            ix = x + (cell_w - dw) / 2
            iy = yy + 7 * mm + ((cell_h - 8 * mm) - dh) / 2
            c.drawImage(ImageReader(path), ix, iy, width=dw, height=dh, mask="auto")
            c.setFillColorRGB(*MUTED)
            c.setFont(F, 7.5)
            c.drawCentredString(x + cell_w / 2, yy + 2.5 * mm, cap)

    # ——— 13 FECHAMENTO ———
    y = b.page()
    y = label(c, "Fechamento", y)
    y = title(c, "Você já sabe onde a vaga some", y, 24)
    y -= 5 * mm
    y = body(
        c,
        "Execute o checklist. Compare a semana 2 com a semana 1. Publique sua marca e tire a agenda do improviso.",
        y,
        11,
    )
    y -= 8 * mm
    card(c, M, y - 40 * mm, W - 2 * M, 42 * mm, ELEV)
    c.setFillColorRGB(*FG)
    c.setFont(FB, 14)
    c.drawString(M + 5 * mm, y - 10 * mm, "Sua barbearia, sua cara,")
    c.drawString(M + 5 * mm, y - 17 * mm, "sem burocracia.")
    c.setFillColorRGB(*MUTED)
    c.setFont(F, 9)
    c.drawString(M + 5 * mm, y - 26 * mm, "Crie no Barbernegon · publique o link · rode os 7 dias")
    c.setFillColorRGB(*BLUE)
    c.roundRect(M + 5 * mm, y - 36 * mm, 55 * mm, 8 * mm, 3, fill=1, stroke=0)
    c.setFillColorRGB(*BG)
    c.setFont(FB, 8.5)
    c.drawCentredString(M + 32.5 * mm, y - 33 * mm, "barbernegon · cadastro")
    y -= 50 * mm
    y = field(c, M, y, W - 2 * M, 12 * mm, "Meu compromisso desta semana (1 frase)")
    y -= 6 * mm
    c.setFillColorRGB(*MUTED)
    c.setFont(F, 8.5)
    c.drawString(M, y, "Barbernegon · Vaga Perdida · material educativo de entrada (R$ 19,90)")
    y -= 4 * mm
    c.drawString(M, y, "Adapte as regras à sua operação. © Barbernegon")

    b.save()


if __name__ == "__main__":
    build()
